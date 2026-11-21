import { DEFAULT_DATA_PATH, loadSentences, type RandomSource, type Sentence } from "./data.ts";

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("The random source must return a number in [0, 1)");
    }
    const other = Math.floor(value * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

export class Jumble {
  readonly deu: string;
  readonly eng: string;
  readonly jumble: string;
  end = false;

  constructor(deu: string, eng: string, random: RandomSource = Math.random) {
    this.deu = deu;
    this.eng = eng;
    this.jumble = this.jumbleSentence(deu, random);
  }

  private jumbleSentence(sentence: string, random: RandomSource): string {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (new Set(words).size < 2) return words.join(" ");

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const jumbled = shuffled(words, random);
      if (jumbled.some((word, index) => word !== words[index])) {
        return jumbled.join(" ");
      }
    }

    // Guarantee a different order even for a pathological random source.
    const moved = words.shift();
    if (moved !== undefined) words.push(moved);
    return words.join(" ");
  }

  answer(response: string): "Richtig" | "Falsch" {
    // Tiles always join words with ordinary spaces. Normalize whitespace on both
    // sides so source text containing NBSPs or repeated whitespace remains solvable.
    const answerWords = response.split(/\s+/).filter(Boolean).join(" ");
    const expectedWords = this.deu.split(/\s+/).filter(Boolean).join(" ");
    if (answerWords === expectedWords) {
      this.end = true;
      return "Richtig";
    }
    return "Falsch";
  }

  translate(): string {
    return this.eng;
  }

  hint(count = 1): string[] {
    if (!Number.isInteger(count)) return [];
    return this.deu.split(/\s+/).filter(Boolean).slice(0, Math.max(0, count));
  }
}

/** The selected sentences for one game. */
export class Game {
  readonly rows: readonly Sentence[];

  constructor(rows: readonly Sentence[]) {
    this.rows = rows;
  }

  static async create(
    maxWords = 6,
    count = 1,
    dataPath: string | URL = DEFAULT_DATA_PATH,
  ): Promise<Game> {
    return new Game(await loadSentences(maxWords, count, dataPath));
  }
}
