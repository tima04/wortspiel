import { HelpRequested, parseTerminalArguments, parseWebArguments } from "./args.ts";
import { assertEquals, assertRejects } from "./test_asserts.ts";

Deno.test("web defaults match the Python application", () => {
  assertEquals(parseWebArguments([]), { sentences: 6, maxWords: 6, port: 8000, noBrowser: false });
});

Deno.test("web options are parsed and browser opening can be disabled", () => {
  assertEquals(
    parseWebArguments(["--sentences", "10", "--max-words", "8", "--port", "8080", "--no-browser"]),
    { sentences: 10, maxWords: 8, port: 8080, noBrowser: true },
  );
});

Deno.test("invalid and unknown options are rejected", async () => {
  for (
    const args of [
      ["--sentences", "0"],
      ["--sentences", "2.5"],
      ["--max-words", "-1"],
      ["--port", "65536"],
      ["--port", "0"],
      ["--sentences"],
      ["--unknown"],
    ]
  ) {
    await assertRejects(() => parseWebArguments(args));
  }
});

Deno.test("terminal options and help are supported", async () => {
  assertEquals(parseTerminalArguments([]), { sentences: 1, maxWords: 6 });
  assertEquals(parseTerminalArguments(["--sentences", "3", "--max-words", "4"]), {
    sentences: 3,
    maxWords: 4,
  });
  await assertRejects(() => parseWebArguments(["--help"]));
  try {
    parseWebArguments(["--help"]);
  } catch (error) {
    assertEquals(error instanceof HelpRequested, true);
  }
});
