"""Run Wortspiel in a local web browser using only the standard library."""

import argparse
from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs
import webbrowser

from game import Game, Jumble


class BrowserGame:
    """Keep the state for one browser game."""

    def __init__(self, max_words=6, n=6):
        game = Game(max_words=max_words, n=n)
        self.jumbles = [Jumble(row.deu, row.eng) for row in game.rows.itertuples(index=False)]
        self.index = 0
        self.message = ""

    @property
    def current(self):
        if self.index < len(self.jumbles):
            return self.jumbles[self.index]
        return None

    def answer(self, response):
        jumble = self.current
        if jumble is None or not response.strip():
            return

        result = jumble.answer(response.strip())
        if jumble.end:
            self.message = f"Richtig! English: {jumble.eng}"
            self.index += 1
            if self.current is None:
                self.message += " You completed the game!"
        else:
            self.message = f"{result}. Try again, ask for a hint, or view the translation."

    def hint(self, n=1):
        if self.current is not None:
            self.message = "Hint: " + " ".join(self.current.hint(max(1, n)))

    def translate(self):
        if self.current is not None:
            self.message = f"English: {self.current.translate()}"

    def restart(self):
        self.jumbles = [Jumble(jumble.deu, jumble.eng) for jumble in self.jumbles]
        self.index = 0
        self.message = "Game restarted."


def render_page(game):
    """Return the complete browser page for the current game state."""
    jumble = game.current
    message = f'<p class="message" role="status">{escape(game.message)}</p>' if game.message else ""

    if jumble is None:
        content = """
            <p class="jumble">Fertig!</p>
            <p>You have completed every sentence.</p>
            <form method="post" action="/restart">
                <button type="submit">Play again</button>
            </form>
        """
        progress = f"{len(game.jumbles)} / {len(game.jumbles)}"
    else:
        words = "\n".join(
            f'                <span class="word" draggable="true" tabindex="0" lang="de" '
            f'title="Drag to reorder, or use the left and right arrow keys">{escape(word)}</span>'
            for word in jumble.jumble.split()
        )
        content = f"""
            <p class="instructions" id="word-instructions">Put the words back in the correct German order by dragging or typing.</p>
            <p class="jumbled-reference">Jumbled words: <strong lang="de">{escape(jumble.jumble)}</strong></p>
            <form method="post" action="/answer">
                <div class="answer-modes" role="group" aria-label="Answer mode">
                    <button class="secondary mode-button" id="drag-mode" type="button" aria-pressed="true">Drag words</button>
                    <button class="secondary mode-button" id="type-mode" type="button" aria-pressed="false">Type answer</button>
                </div>
                <div id="drag-panel">
                    <div class="word-bank" id="word-bank" role="group" aria-describedby="word-instructions">
{words}
                    </div>
                </div>
                <div id="typing-panel" hidden>
                    <label for="typed-answer">Your answer</label>
                    <input id="typed-answer" lang="de" autocomplete="off" autofocus>
                </div>
                <input id="answer" name="answer" type="hidden" value="{escape(jumble.jumble)}">
                <button type="submit">Check answer</button>
            </form>
            <div class="tools">
                <form method="post" action="/hint">
                    <input class="hint-count" type="number" name="n" value="1" min="1" required aria-label="Number of hint words">
                    <button class="secondary" type="submit">Hint</button>
                </form>
                <form method="post" action="/translate">
                    <button class="secondary" type="submit">Translation</button>
                </form>
            </div>
        """
        progress = f"{game.index + 1} / {len(game.jumbles)}"

    return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Wortspiel</title>
    <style>
        :root {{ color-scheme: light dark; font-family: system-ui, sans-serif; }}
        body {{
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f3f4f6;
            color: #172033;
        }}
        main {{
            box-sizing: border-box;
            width: min(92vw, 650px);
            padding: 2.5rem;
            border-radius: 1rem;
            background: white;
            box-shadow: 0 1rem 3rem #17203320;
        }}
        h1 {{ margin: 0; font-size: 2rem; }}
        .progress {{ color: #667085; }}
        .instructions {{ margin-bottom: .5rem; }}
        .jumbled-reference {{ font-size: 1.25rem; line-height: 1.5; }}
        .jumbled-reference strong {{ display: block; }}
        .answer-modes {{ display: flex; gap: .5rem; margin-top: 1rem; }}
        .answer-modes .mode-button {{ margin-top: 0; background: #e4e7ec; color: #172033; }}
        .answer-modes .mode-button[aria-pressed="true"] {{ background: #175cd3; color: white; }}
        #typing-panel {{ margin-top: 1.5rem; }}
        .word-bank {{
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
            min-height: 4rem;
            margin: 1.5rem 0;
            padding: 1rem;
            border: 2px dashed #98a2b3;
            border-radius: .75rem;
        }}
        .word {{
            padding: .6rem .85rem;
            border: 1px solid #84adff;
            border-radius: .5rem;
            background: #eaf2ff;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: grab;
            user-select: none;
        }}
        .word:focus-visible {{ outline: 3px solid #175cd3; outline-offset: 2px; }}
        .word.dragging {{ opacity: .4; cursor: grabbing; }}
        .jumble {{
            margin: 1.5rem 0;
            font-size: clamp(1.5rem, 4vw, 2.2rem);
            font-weight: 700;
            line-height: 1.35;
        }}
        label {{ display: block; margin-bottom: .5rem; font-weight: 600; }}
        input {{
            box-sizing: border-box;
            width: 100%;
            padding: .8rem;
            border: 1px solid #98a2b3;
            border-radius: .5rem;
            font: inherit;
        }}
        button {{
            margin-top: 1rem;
            padding: .75rem 1.1rem;
            border: 0;
            border-radius: .5rem;
            background: #175cd3;
            color: white;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }}
        button:hover {{ background: #004eeb; }}
        .tools {{ display: flex; gap: .75rem; }}
        .tools form {{ display: flex; gap: .5rem; }}
        .tools .hint-count {{ width: 5rem; margin-top: 1rem; }}
        .tools .secondary {{ background: #e4e7ec; color: #172033; }}
        .tools .secondary:hover {{ background: #d0d5dd; }}
        .message {{ padding: .8rem; border-radius: .5rem; background: #eaf2ff; }}
        @media (prefers-color-scheme: dark) {{
            body {{ background: #101828; color: #f2f4f7; }}
            main {{ background: #1d2939; }}
            .progress {{ color: #d0d5dd; }}
            .message {{ background: #1849a9; }}
            .word {{ background: #1849a9; }}
            .answer-modes .mode-button {{ background: #344054; color: #f2f4f7; }}
            .answer-modes .mode-button[aria-pressed="true"] {{ background: #84adff; color: #101828; }}
            .tools .secondary {{ background: #344054; color: #f2f4f7; }}
        }}
        @media (max-width: 500px) {{ main {{ padding: 1.5rem; }} }}
    </style>
</head>
<body>
    <main>
        <h1>Wortspiel</h1>
        <p class="progress">Sentence {progress}</p>
        {message}
        {content}
    </main>
    <script>
        const bank = document.getElementById("word-bank");
        if (bank) {{
            const answer = document.getElementById("answer");
            const typedAnswer = document.getElementById("typed-answer");
            const dragPanel = document.getElementById("drag-panel");
            const typingPanel = document.getElementById("typing-panel");
            const dragMode = document.getElementById("drag-mode");
            const typeMode = document.getElementById("type-mode");
            let dragged = null;
            let mode = "drag";

            function updateAnswer() {{
                answer.value = mode === "type"
                    ? typedAnswer.value
                    : Array.from(bank.querySelectorAll(".word"), word => word.textContent).join(" ");
            }}

            function showMode(nextMode) {{
                mode = nextMode;
                dragPanel.hidden = mode !== "drag";
                typingPanel.hidden = mode !== "type";
                dragMode.setAttribute("aria-pressed", mode === "drag");
                typeMode.setAttribute("aria-pressed", mode === "type");
                typedAnswer.required = mode === "type";
                updateAnswer();
                if (mode === "type") typedAnswer.focus();
            }}

            dragMode.addEventListener("click", () => showMode("drag"));
            typeMode.addEventListener("click", () => showMode("type"));
            typedAnswer.addEventListener("input", updateAnswer);
            answer.form.addEventListener("submit", updateAnswer);

            bank.addEventListener("dragstart", event => {{
                dragged = event.target.closest(".word");
                if (!dragged) return;
                dragged.classList.add("dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", dragged.textContent);
            }});

            bank.addEventListener("dragend", () => {{
                if (dragged) dragged.classList.remove("dragging");
                dragged = null;
            }});

            bank.addEventListener("dragover", event => event.preventDefault());

            bank.addEventListener("drop", event => {{
                event.preventDefault();
                if (!dragged) return;
                const target = event.target.closest(".word");
                if (target && target !== dragged) {{
                    target.before(dragged);
                }} else if (!target) {{
                    bank.append(dragged);
                }}
                updateAnswer();
            }});

            bank.addEventListener("keydown", event => {{
                const word = event.target.closest(".word");
                if (!word) return;
                if (event.key === "ArrowLeft" && word.previousElementSibling) {{
                    event.preventDefault();
                    word.previousElementSibling.before(word);
                }} else if (event.key === "ArrowRight" && word.nextElementSibling) {{
                    event.preventDefault();
                    word.nextElementSibling.after(word);
                }} else {{
                    return;
                }}
                updateAnswer();
            }});

            updateAnswer();
        }}
    </script>
</body>
</html>
"""


class GameHandler(BaseHTTPRequestHandler):
    """Serve the page and handle form submissions."""

    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        page = render_page(self.server.game).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(page)))
        self.end_headers()
        self.wfile.write(page)

    def do_POST(self):
        actions = {
            "/answer": self._answer,
            "/hint": self._hint,
            "/translate": lambda: self.server.game.translate(),
            "/restart": lambda: self.server.game.restart(),
        }
        action = actions.get(self.path)
        if action is None:
            self.send_error(404)
            return
        action()
        self.send_response(303)
        self.send_header("Location", "/")
        self.end_headers()

    def _read_form(self):
        length = int(self.headers.get("Content-Length", 0))
        return parse_qs(self.rfile.read(length).decode("utf-8"))

    def _answer(self):
        form = self._read_form()
        self.server.game.answer(form.get("answer", [""])[0])

    def _hint(self):
        form = self._read_form()
        try:
            n = int(form.get("n", ["1"])[0])
        except ValueError:
            n = 1
        self.server.game.hint(n)


def main():
    parser = argparse.ArgumentParser(description="Play Wortspiel in your web browser.")
    parser.add_argument("--words", type=int, default=6, help="number of sentences (default: 6)")
    parser.add_argument("--max-words", type=int, default=6, help="maximum words per sentence (default: 6)")
    parser.add_argument("--port", type=int, default=8000, help="local server port (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser automatically")
    args = parser.parse_args()

    server = HTTPServer(("127.0.0.1", args.port), GameHandler)
    server.game = BrowserGame(max_words=args.max_words, n=args.words)
    url = f"http://127.0.0.1:{server.server_address[1]}"
    print(f"Wortspiel is available at {url}. Press Ctrl+C to stop.")
    if not args.no_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Wortspiel.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
