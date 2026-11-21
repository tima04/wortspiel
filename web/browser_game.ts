import type { RandomSource, Sentence } from "./data.ts";
import { Game, Jumble } from "./game.ts";

/** State for one browser game. */
export class BrowserGame {
  jumbles: Jumble[];
  index = 0;
  message = "";
  readonly #random: RandomSource;

  constructor(sentences: readonly Sentence[], random: RandomSource = Math.random) {
    this.#random = random;
    this.jumbles = sentences.map((row) => new Jumble(row.deu, row.eng, random));
  }

  static async create(maxWords = 6, count = 6): Promise<BrowserGame> {
    const game = await Game.create(maxWords, count);
    return new BrowserGame(game.rows);
  }

  get current(): Jumble | undefined {
    return this.jumbles[this.index];
  }

  answer(response: string): void {
    const jumble = this.current;
    if (!jumble || !response.trim()) return;

    const result = jumble.answer(response.trim());
    if (jumble.end) {
      this.message = `Richtig! English: ${jumble.eng}`;
      this.index += 1;
      if (!this.current) this.message += " You completed the game!";
    } else {
      this.message = `${result}. Try again, ask for a hint, or view the translation.`;
    }
  }

  hint(count = 1): void {
    const jumble = this.current;
    if (!jumble) return;
    const safeCount = Number.isInteger(count) ? Math.max(1, count) : 1;
    this.message = `Hint: ${jumble.hint(safeCount).join(" ")}`;
  }

  translate(): void {
    if (this.current) this.message = `English: ${this.current.translate()}`;
  }

  restart(): void {
    this.jumbles = this.jumbles.map((jumble) => new Jumble(jumble.deu, jumble.eng, this.#random));
    this.index = 0;
    this.message = "Game restarted.";
  }
}
