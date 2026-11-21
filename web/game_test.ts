import { Jumble } from "./game.ts";
import { assert, assertEquals } from "./test_asserts.ts";

function cyclingRandom(): () => number {
  const values = [0.1, 0.8, 0.35, 0.65];
  let index = 0;
  return () => values[index++ % values.length]!;
}

Deno.test("Jumble changes word order when distinct words exist", () => {
  const jumble = new Jumble("Das ist ein Test", "This is a test", cyclingRandom());
  assert(jumble.jumble !== jumble.deu);
  assertEquals(jumble.jumble.split(" ").sort(), jumble.deu.split(" ").sort());
});

Deno.test("Jumble guarantees change even with a stationary random source", () => {
  const jumble = new Jumble("eins zwei drei", "one two three", () => 0.999999);
  assert(jumble.jumble !== jumble.deu);
});

Deno.test("Jumble preserves a one-word or repeated-word sentence", () => {
  assertEquals(new Jumble("Hallo", "Hello", cyclingRandom()).jumble, "Hallo");
  assertEquals(new Jumble("ja ja ja", "yes yes yes", cyclingRandom()).jumble, "ja ja ja");
});

Deno.test("answers preserve case and punctuation but normalize whitespace", () => {
  const jumble = new Jumble("Guten Tag", "Good day", cyclingRandom());
  assertEquals(jumble.answer("guten Tag"), "Falsch");
  assertEquals(jumble.answer("Guten Tag!"), "Falsch");
  assertEquals(jumble.end, false);
  assertEquals(jumble.answer("  Guten   Tag "), "Richtig");
  assertEquals(jumble.end, true);
});

Deno.test("dragged answers with ordinary spaces match source non-breaking spaces", () => {
  const jumble = new Jumble("Ich rufe um 16\u00a0Uhr zurück.", "I'll call back at 4 pm.");
  assertEquals(jumble.answer("Ich rufe um 16 Uhr zurück."), "Richtig");
  assertEquals(jumble.end, true);
});

Deno.test("hint and translation expose only the requested information", () => {
  const jumble = new Jumble("Das ist ein langer Satz", "This is a long sentence");
  assertEquals(jumble.hint(), ["Das"]);
  assertEquals(jumble.hint(3), ["Das", "ist", "ein"]);
  assertEquals(jumble.hint(99), ["Das", "ist", "ein", "langer", "Satz"]);
  assertEquals(jumble.translate(), "This is a long sentence");
});
