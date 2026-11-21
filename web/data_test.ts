import { parseCsv, selectSentences } from "./data.ts";
import { assertEquals, assertRejects } from "./test_asserts.ts";

function textStream(text: string, chunkSize = text.length): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < text.length; index += chunkSize) {
        controller.enqueue(text.slice(index, index + chunkSize));
      }
      controller.close();
    },
  });
}

async function parse(text: string): Promise<string[][]> {
  const rows: string[][] = [];
  for await (const row of parseCsv(textStream(text, 1))) rows.push(row);
  return rows;
}

function records(rows: readonly string[][]): AsyncIterable<string[]> {
  return (async function* () {
    for (const row of rows) yield row;
  })();
}

Deno.test("parseCsv handles delimiters, escaped quotes and newlines across chunks", async () => {
  const rows = await parse(
    'deu,eng,nwords\r\n"Das ist, gut","He said ""hello""",3\r\n"Zwei\nZeilen",plain,2\r\n',
  );
  assertEquals(rows, [
    ["deu", "eng", "nwords"],
    ["Das ist, gut", 'He said "hello"', "3"],
    ["Zwei\nZeilen", "plain", "2"],
  ]);
});

Deno.test("parseCsv accepts a final row without a newline and ignores blank lines", async () => {
  assertEquals(await parse("a,b\n\n1,2"), [["a", "b"], ["1", "2"]]);
});

Deno.test("parseCsv rejects malformed input", async () => {
  await assertRejects(() => parse('"unterminated,value'), "unterminated");
  await assertRejects(() => parse('"quoted"x,value'), "after a closing quote");
});

Deno.test("selectSentences filters and samples without replacement", async () => {
  const rows = records([
    ["deu", "eng", "nwords", "extra"],
    ["Eins", "One", "1", "a"],
    ["Zwei Wörter", "Two words", "2", "b"],
    ["Zu viele Wörter", "Too many words", "4", "c"],
    ["Drei Wörter hier", "Three words here", "3", "d"],
    ["Noch eins", "Another one", "2", "e"],
  ]);
  const selected = await selectSentences(rows, 3, 2, () => 0);
  assertEquals(selected.map((row) => row.deu), ["Noch eins", "Zwei Wörter"]);
  assertEquals(new Set(selected).size, selected.length);
});

Deno.test("selectSentences excludes blank word counts instead of treating them as zero", async () => {
  const rows = records([
    ["deu", "eng", "nwords"],
    ["Leer", "Empty", ""],
    ["Leerzeichen", "Whitespace", "   "],
    ["Gültig", "Valid", "1"],
  ]);
  const selected = await selectSentences(rows, 6, 1, () => 0.999999);
  assertEquals(selected.map((row) => row.deu), ["Gültig"]);
});

Deno.test("selectSentences reports insufficient eligible rows", async () => {
  const rows = records([
    ["deu", "eng", "nwords"],
    ["Nur eins", "Only one", "1"],
  ]);
  await assertRejects(() => selectSentences(rows, 6, 2), "Only 1 sentences");
});

Deno.test("selectSentences validates options, headers and fields", async () => {
  const emptyRows = records([]);
  await assertRejects(() => selectSentences(emptyRows, 6, 1), "empty");

  const invalidHeader = records([["deu", "eng"]]);
  await assertRejects(() => selectSentences(invalidHeader, 6, 1), "nwords");

  const invalidWordCount = records([["deu", "eng", "nwords"], ["Hallo", "Hello", "x"]]);
  await assertRejects(() => selectSentences(invalidWordCount, 6, 1), "invalid nwords");

  const validRows = records([["deu", "eng", "nwords"]]);
  await assertRejects(() => selectSentences(validRows, 0, 1), "maxWords");
});
