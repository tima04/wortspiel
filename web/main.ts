import { HelpRequested, parseWebArguments } from "./args.ts";
import { BrowserGame } from "./browser_game.ts";
import { renderPage } from "./page.ts";

const MAX_FORM_BYTES = 16 * 1024;
const baseHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function response(
  body: string,
  status: number,
  contentType = "text/plain; charset=utf-8",
): Response {
  return new Response(body, {
    status,
    headers: { ...baseHeaders, "Content-Type": contentType },
  });
}

function redirect(): Response {
  return new Response(null, { status: 303, headers: { ...baseHeaders, Location: "/" } });
}

async function formValue(request: Request, name: string): Promise<string | undefined> {
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isInteger(length) || length < 0 || length > MAX_FORM_BYTES) {
      throw new RangeError("Invalid form size");
    }
  }

  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_FORM_BYTES) {
      await reader.cancel();
      throw new RangeError("Form is too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  return new URLSearchParams(body).get(name) ?? undefined;
}

function isCrossSiteRequest(request: Request): boolean {
  // Origin and Host can differ behind development port forwarders. Fetch Metadata
  // avoids that false positive while modern browsers still mark cross-site forms.
  return request.headers.get("Sec-Fetch-Site")?.toLowerCase() === "cross-site";
}

/** Handle one HTTP request. Exported separately so it can be tested without a socket. */
export async function handleRequest(request: Request, game: BrowserGame): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (request.method === "GET") {
    if (path !== "/") return response("Not found\n", 404);
    return response(renderPage(game), 200, "text/html; charset=utf-8");
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed\n", {
      status: 405,
      headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8", Allow: "GET, POST" },
    });
  }
  if (!["/answer", "/hint", "/translate", "/restart"].includes(path)) {
    return response("Not found\n", 404);
  }
  if (isCrossSiteRequest(request)) return response("Forbidden\n", 403);

  try {
    if (path === "/answer") {
      game.answer(await formValue(request, "answer") ?? "");
    } else if (path === "/hint") {
      const count = Number(await formValue(request, "n") ?? "1");
      game.hint(Number.isInteger(count) ? count : 1);
    } else if (path === "/translate") {
      game.translate();
    } else {
      game.restart();
    }
    return redirect();
  } catch (error) {
    if (error instanceof RangeError) return response("Form is too large\n", 413);
    return response("Invalid form\n", 400);
  }
}

async function openBrowser(url: string): Promise<void> {
  const command = Deno.build.os === "darwin"
    ? "open"
    : Deno.build.os === "windows"
    ? "cmd"
    : "xdg-open";
  const args = Deno.build.os === "windows" ? ["/c", "start", "", url] : [url];
  await new Deno.Command(command, {
    args,
    stdin: "null",
    stdout: "null",
    stderr: "null",
  }).output();
}

export async function runWebServer(
  sentences: number,
  maxWords: number,
  port: number,
  noBrowser = false,
): Promise<void> {
  const game = await BrowserGame.create(maxWords, sentences);
  const controller = new AbortController();
  Deno.addSignalListener("SIGINT", () => {
    console.log("\nStopping Wortspiel.");
    controller.abort();
  });

  const server = Deno.serve({
    hostname: "127.0.0.1",
    port,
    signal: controller.signal,
    onListen: ({ port: listeningPort }) => {
      const url = `http://127.0.0.1:${listeningPort}`;
      console.log(`Wortspiel is available at ${url}. Press Ctrl+C to stop.`);
      if (!noBrowser) {
        void openBrowser(url).catch((error: unknown) => {
          const reason = error instanceof Deno.errors.NotCapable
            ? "Permission was not granted"
            : "The browser command failed";
          console.error(`${reason}. Open ${url} manually.`);
        });
      }
    },
  }, (request) => handleRequest(request, game));

  await server.finished;
}

if (import.meta.main) {
  try {
    const options = parseWebArguments(Deno.args);
    await runWebServer(options.sentences, options.maxWords, options.port, options.noBrowser);
  } catch (error) {
    if (error instanceof HelpRequested) {
      console.log(
        "Usage: deno task start [--sentences N --max-words N --port PORT]\n" +
          "Use deno task start:browser to open the game in a browser automatically.",
      );
    } else {
      console.error(error instanceof Error ? error.message : error);
      Deno.exitCode = 1;
    }
  }
}
