import { BrowserGame } from "./browser_game.ts";
import { handleRequest } from "./main.ts";
import { escapeHtml, renderPage } from "./page.ts";
import { assert, assertEquals, assertStringIncludes } from "./test_asserts.ts";

const sentences = [{ deu: "Guten Tag", eng: "Good day", nwords: 2 }];

function get(path = "/"): Request {
  return new Request(`http://127.0.0.1${path}`);
}

function post(path: string, body = ""): Request {
  return new Request(`http://127.0.0.1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

Deno.test("escapeHtml protects text and attribute contexts", () => {
  assertEquals(
    escapeHtml(`<script a="b">&'</script>`),
    "&lt;script a=&quot;b&quot;&gt;&amp;&#39;&lt;/script&gt;",
  );
});

Deno.test("renderPage includes controls, progress and escaped translations", () => {
  const game = new BrowserGame(sentences);
  game.translate();
  const page = renderPage(game);
  assertStringIncludes(page, "Sentence 1 / 1");
  assertStringIncludes(page, 'id="word-bank"');
  assertStringIncludes(page, 'id="type-mode"');
  assertStringIncludes(page, "English: Good day");
  assertStringIncludes(page, 'action="/hint"');
});

Deno.test("renderPage escapes untrusted sentence and message content", () => {
  const game = new BrowserGame([
    { deu: '<img src=x onerror="bad"> gut', eng: "<script>alert('x')</script>", nwords: 2 },
  ]);
  game.translate();
  const page = renderPage(game);
  assert(!page.includes("<script>alert"));
  assert(!page.includes('<img src=x onerror="bad">'));
  assertStringIncludes(page, "&lt;script&gt;");
  assertStringIncludes(page, "&lt;img");
  assertStringIncludes(page, "onerror=&quot;bad&quot;&gt;");
});

Deno.test("completed page offers play again", () => {
  const game = new BrowserGame(sentences);
  game.answer("Guten Tag");
  const page = renderPage(game);
  assertStringIncludes(page, "Fertig!");
  assertStringIncludes(page, "Sentence 1 / 1");
  assertStringIncludes(page, 'action="/restart"');
});

Deno.test("GET serves secure HTML and unknown paths return 404", async () => {
  const game = new BrowserGame(sentences);
  const page = await handleRequest(get(), game);
  assertEquals(page.status, 200);
  assertEquals(page.headers.get("Content-Type"), "text/html; charset=utf-8");
  assertEquals(page.headers.get("X-Content-Type-Options"), "nosniff");
  assertStringIncludes(page.headers.get("Content-Security-Policy") ?? "", "default-src 'none'");
  assertStringIncludes(await page.text(), "<title>Wortspiel</title>");

  const missing = await handleRequest(get("/missing"), game);
  assertEquals(missing.status, 404);
});

Deno.test("answer, hint and translation forms update state and redirect", async () => {
  const game = new BrowserGame(sentences);
  const wrong = await handleRequest(post("/answer", "answer=Falsch"), game);
  assertEquals(wrong.status, 303);
  assertEquals(wrong.headers.get("Location"), "/");
  assertEquals(game.index, 0);

  const hint = await handleRequest(post("/hint", "n=2"), game);
  assertEquals(hint.status, 303);
  assertEquals(game.message, "Hint: Guten Tag");

  const translation = await handleRequest(post("/translate"), game);
  assertEquals(translation.status, 303);
  assertEquals(game.message, "English: Good day");

  const correct = await handleRequest(post("/answer", "answer=Guten+Tag"), game);
  assertEquals(correct.status, 303);
  assertEquals(game.index, 1);
});

Deno.test("restart resets completed games", async () => {
  const game = new BrowserGame(sentences);
  game.answer("Guten Tag");
  const result = await handleRequest(post("/restart"), game);
  assertEquals(result.status, 303);
  assertEquals(game.index, 0);
  assertEquals(game.message, "Game restarted.");
});

Deno.test("invalid methods, routes, forms and oversized forms are rejected", async () => {
  const game = new BrowserGame(sentences);
  assertEquals(
    (await handleRequest(new Request("http://127.0.0.1/", { method: "PUT" }), game)).status,
    405,
  );
  assertEquals((await handleRequest(post("/missing"), game)).status, 404);
  assertEquals((await handleRequest(post("/hint", "n=not-a-number"), game)).status, 303);
  assertEquals(game.message, "Hint: Guten");

  const oversized = new Request("http://127.0.0.1/answer", {
    method: "POST",
    headers: { "Content-Length": "20000" },
    body: "answer=no",
  });
  assertEquals((await handleRequest(oversized, game)).status, 413);
});

Deno.test("an oversized body is limited without a Content-Length header", async () => {
  const game = new BrowserGame(sentences);
  const oversized = post("/answer", `answer=${"x".repeat(17 * 1024)}`);
  assertEquals(oversized.headers.get("Content-Length"), null);
  assertEquals((await handleRequest(oversized, game)).status, 413);
  assertEquals(game.message, "");
});

Deno.test("cross-site Fetch Metadata is rejected without breaking forwarded origins", async () => {
  const game = new BrowserGame(sentences);
  const crossSite = new Request("http://127.0.0.1/answer", {
    method: "POST",
    headers: { "Sec-Fetch-Site": "cross-site" },
    body: "answer=Guten+Tag",
  });
  assertEquals((await handleRequest(crossSite, game)).status, 403);
  assertEquals(game.index, 0);

  const acceptedHeaders: Record<string, string>[] = [
    { Origin: "http://127.0.0.1", "Sec-Fetch-Site": "same-origin" },
    { Origin: "https://forwarded.example", "Sec-Fetch-Site": "same-origin" },
    { Origin: "null" },
  ];
  for (const headers of acceptedHeaders) {
    const acceptedGame = new BrowserGame(sentences);
    const request = new Request("http://127.0.0.1/answer", {
      method: "POST",
      headers,
      body: "answer=Guten+Tag",
    });
    assertEquals((await handleRequest(request, acceptedGame)).status, 303);
    assertEquals(acceptedGame.index, 1);
  }
});
