/** A sentence and its English translation from the source CSV. */
export interface Sentence {
  deu: string;
  eng: string;
  nwords: number;
}

export type RandomSource = () => number;
export const DEFAULT_DATA_PATH = new URL("../data/deu_eng_table.csv.gz", import.meta.url);

/**
 * Parse RFC 4180-style CSV incrementally, including quoted commas, quotes and newlines.
 * No whole CSV file is buffered in memory.
 */
export async function* parseCsv(
  input: ReadableStream<string>,
): AsyncGenerator<string[]> {
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let closedQuote = false;
  let recordStarted = false;
  let skipLineFeed = false;

  for await (const chunk of input) {
    for (const character of chunk) {
      if (skipLineFeed) {
        skipLineFeed = false;
        if (character === "\n") continue;
      }

      if (inQuotes) {
        if (character === '"') {
          inQuotes = false;
          closedQuote = true;
        } else {
          field += character;
        }
        recordStarted = true;
        continue;
      }

      if (closedQuote) {
        if (character === '"') {
          field += '"';
          inQuotes = true;
          closedQuote = false;
          continue;
        }
        if (character !== "," && character !== "\n" && character !== "\r") {
          throw new Error("Invalid CSV: unexpected character after a closing quote");
        }
        closedQuote = false;
      }

      if (character === '"' && field.length === 0) {
        inQuotes = true;
        recordStarted = true;
      } else if (character === ",") {
        record.push(field);
        field = "";
        recordStarted = true;
      } else if (character === "\n" || character === "\r") {
        record.push(field);
        if (recordStarted || field.length > 0 || record.length > 1) {
          yield record;
        }
        field = "";
        record = [];
        recordStarted = false;
        skipLineFeed = character === "\r";
      } else {
        field += character;
        recordStarted = true;
      }
    }
  }

  if (inQuotes) throw new Error("Invalid CSV: unterminated quoted field");
  if (recordStarted || field.length > 0 || record.length > 0) {
    record.push(field);
    yield record;
  }
}

function randomIndex(random: RandomSource, upperBound: number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error("The random source must return a number in [0, 1)");
  }
  return Math.floor(value * upperBound);
}

/** Select a uniform random sample with reservoir sampling. */
export async function selectSentences(
  records: AsyncIterable<string[]>,
  maxWords: number,
  count: number,
  random: RandomSource = Math.random,
): Promise<Sentence[]> {
  if (!Number.isInteger(maxWords) || maxWords < 1) {
    throw new Error("maxWords must be a positive integer");
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("count must be a non-negative integer");
  }

  const iterator = records[Symbol.asyncIterator]();
  const header = await iterator.next();
  if (header.done) throw new Error("The sentence CSV is empty");

  const headings = header.value.map((heading) => heading.replace(/^\uFEFF/, ""));
  const deuIndex = headings.indexOf("deu");
  const engIndex = headings.indexOf("eng");
  const wordCountIndex = headings.indexOf("nwords");
  if (deuIndex < 0 || engIndex < 0 || wordCountIndex < 0) {
    throw new Error("The sentence CSV must contain deu, eng and nwords columns");
  }

  const sample: Sentence[] = [];
  let eligibleRows = 0;
  let rowNumber = 1;

  while (true) {
    const next = await iterator.next();
    if (next.done) break;
    rowNumber += 1;
    const row = next.value;
    if (row.length !== headings.length) {
      throw new Error(`Invalid CSV: wrong number of fields on row ${rowNumber}`);
    }

    const wordCountText = row[wordCountIndex];
    const deu = row[deuIndex];
    const eng = row[engIndex];
    if (wordCountText === undefined || deu === undefined || eng === undefined) {
      throw new Error(`Invalid CSV: missing data on row ${rowNumber}`);
    }

    // Pandas reads blank numeric fields as NaN, which its query filters out.
    if (!wordCountText.trim()) continue;
    const nwords = Number(wordCountText);
    if (!Number.isInteger(nwords) || nwords < 0) {
      throw new Error(`Invalid CSV: invalid nwords value on row ${rowNumber}`);
    }
    if (nwords > maxWords) continue;

    const sentence = { deu, eng, nwords };
    eligibleRows += 1;
    if (sample.length < count) {
      sample.push(sentence);
    } else if (count > 0) {
      const selected = randomIndex(random, eligibleRows);
      if (selected < count) sample[selected] = sentence;
    }
  }

  if (sample.length < count) {
    throw new Error(
      `Only ${sample.length} sentences have at most ${maxWords} words; ${count} were requested`,
    );
  }
  return sample;
}

/** Read the gzip-compressed CSV using only built-in Web and Deno APIs. */
export async function loadSentences(
  maxWords = 6,
  count = 1,
  dataPath: string | URL = DEFAULT_DATA_PATH,
  random: RandomSource = Math.random,
): Promise<Sentence[]> {
  const compressed = await Deno.readFile(dataPath);
  const response = new Response(compressed);
  if (!response.body) throw new Error("Could not read the sentence CSV");

  const csv = response.body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream());
  return await selectSentences(parseCsv(csv), maxWords, count, random);
}
