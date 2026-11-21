import { HelpRequested, parseTerminalArguments, parseWebArguments } from "./args.ts";
import { assertEquals, assertRejects } from "./test_asserts.ts";

Deno.test("web defaults match the Python application", () => {
  assertEquals(parseWebArguments([]), { words: 6, maxWords: 6, port: 8000, noBrowser: false });
});

Deno.test("web options are parsed and browser opening can be disabled", () => {
  assertEquals(
    parseWebArguments(["--words", "10", "--max-words", "8", "--port", "8080", "--no-browser"]),
    { words: 10, maxWords: 8, port: 8080, noBrowser: true },
  );
});

Deno.test("invalid and unknown options are rejected", async () => {
  for (
    const args of [
      ["--words", "0"],
      ["--words", "2.5"],
      ["--max-words", "-1"],
      ["--port", "65536"],
      ["--port", "0"],
      ["--words"],
      ["--unknown"],
    ]
  ) {
    await assertRejects(() => parseWebArguments(args));
  }
});

Deno.test("terminal options and help are supported", async () => {
  assertEquals(parseTerminalArguments([]), { words: 1, maxWords: 6 });
  assertEquals(parseTerminalArguments(["--words", "3", "--max-words", "4"]), {
    words: 3,
    maxWords: 4,
  });
  await assertRejects(() => parseWebArguments(["--help"]));
  try {
    parseWebArguments(["--help"]);
  } catch (error) {
    assertEquals(error instanceof HelpRequested, true);
  }
});
