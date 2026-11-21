import type { BrowserGame } from "./browser_game.ts";

/** Escape text for HTML text nodes and quoted attributes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function answerControls(jumbled: string): string {
  const words = jumbled.split(/\s+/).filter(Boolean).map((word) =>
    `                <span class="word" draggable="true" tabindex="0" lang="de" ` +
    `title="Drag to reorder, or use the left and right arrow keys">${escapeHtml(word)}</span>`
  ).join("\n");

  const escapedJumble = escapeHtml(jumbled);
  return `
            <p class="instructions" id="word-instructions">Put the words back in the correct German order by dragging or typing.</p>
            <p class="jumbled-reference">Jumbled words: <strong lang="de">${escapedJumble}</strong></p>
            <form method="post" action="/answer">
                <div class="answer-modes" role="group" aria-label="Answer mode">
                    <button class="secondary mode-button" id="drag-mode" type="button" aria-pressed="true">Drag words</button>
                    <button class="secondary mode-button" id="type-mode" type="button" aria-pressed="false">Type answer</button>
                </div>
                <div id="drag-panel">
                    <div class="word-bank" id="word-bank" role="group" aria-describedby="word-instructions">
${words}
                    </div>
                </div>
                <div id="typing-panel" hidden>
                    <label for="typed-answer">Your answer</label>
                    <input id="typed-answer" lang="de" autocomplete="off" autofocus>
                </div>
                <input id="answer" name="answer" type="hidden" value="${escapedJumble}">
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
            </div>`;
}

/** Return the complete browser page for the current game state. */
export function renderPage(game: BrowserGame): string {
  const jumble = game.current;
  const message = game.message
    ? `<p class="message" role="status">${escapeHtml(game.message)}</p>`
    : "";

  let content: string;
  let progress: string;
  if (!jumble) {
    content = `
            <p class="jumble">Fertig!</p>
            <p>You have completed every sentence.</p>
            <form method="post" action="/restart">
                <button type="submit">Play again</button>
            </form>`;
    progress = `${game.jumbles.length} / ${game.jumbles.length}`;
  } else {
    content = answerControls(jumble.jumble);
    progress = `${game.index + 1} / ${game.jumbles.length}`;
  }

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Wortspiel</title>
    <style>
        :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f3f4f6;
            color: #172033;
        }
        main {
            box-sizing: border-box;
            width: min(92vw, 650px);
            padding: 2.5rem;
            border-radius: 1rem;
            background: white;
            box-shadow: 0 1rem 3rem #17203320;
        }
        h1 { margin: 0; font-size: 2rem; }
        .progress { color: #667085; }
        .instructions { margin-bottom: .5rem; }
        .jumbled-reference { font-size: 1.25rem; line-height: 1.5; }
        .jumbled-reference strong { display: block; }
        .answer-modes { display: flex; gap: .5rem; margin-top: 1rem; }
        .answer-modes .mode-button { margin-top: 0; background: #e4e7ec; color: #172033; }
        .answer-modes .mode-button[aria-pressed="true"] { background: #175cd3; color: white; }
        #typing-panel { margin-top: 1.5rem; }
        .word-bank {
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
            min-height: 4rem;
            margin: 1.5rem 0;
            padding: 1rem;
            border: 2px dashed #98a2b3;
            border-radius: .75rem;
        }
        .word {
            padding: .6rem .85rem;
            border: 1px solid #84adff;
            border-radius: .5rem;
            background: #eaf2ff;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: grab;
            user-select: none;
        }
        .word:focus-visible { outline: 3px solid #175cd3; outline-offset: 2px; }
        .word.dragging { opacity: .4; cursor: grabbing; }
        .jumble {
            margin: 1.5rem 0;
            font-size: clamp(1.5rem, 4vw, 2.2rem);
            font-weight: 700;
            line-height: 1.35;
        }
        label { display: block; margin-bottom: .5rem; font-weight: 600; }
        input {
            box-sizing: border-box;
            width: 100%;
            padding: .8rem;
            border: 1px solid #98a2b3;
            border-radius: .5rem;
            font: inherit;
        }
        button {
            margin-top: 1rem;
            padding: .75rem 1.1rem;
            border: 0;
            border-radius: .5rem;
            background: #175cd3;
            color: white;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover { background: #004eeb; }
        .tools { display: flex; gap: .75rem; }
        .tools form { display: flex; gap: .5rem; }
        .tools .hint-count { width: 5rem; margin-top: 1rem; }
        .tools .secondary { background: #e4e7ec; color: #172033; }
        .tools .secondary:hover { background: #d0d5dd; }
        .message { padding: .8rem; border-radius: .5rem; background: #eaf2ff; }
        @media (prefers-color-scheme: dark) {
            body { background: #101828; color: #f2f4f7; }
            main { background: #1d2939; }
            .progress { color: #d0d5dd; }
            .message { background: #1849a9; }
            .word { background: #1849a9; }
            .answer-modes .mode-button { background: #344054; color: #f2f4f7; }
            .answer-modes .mode-button[aria-pressed="true"] { background: #84adff; color: #101828; }
            .tools .secondary { background: #344054; color: #f2f4f7; }
        }
        @media (max-width: 500px) { main { padding: 1.5rem; } }
    </style>
</head>
<body>
    <main>
        <h1>Wortspiel</h1>
        <p class="progress">Sentence ${progress}</p>
        ${message}
        ${content}
    </main>
    <script>
        const bank = document.getElementById("word-bank");
        if (bank) {
            const answer = document.getElementById("answer");
            const typedAnswer = document.getElementById("typed-answer");
            const dragPanel = document.getElementById("drag-panel");
            const typingPanel = document.getElementById("typing-panel");
            const dragMode = document.getElementById("drag-mode");
            const typeMode = document.getElementById("type-mode");
            let dragged = null;
            let mode = "drag";

            function updateAnswer() {
                answer.value = mode === "type"
                    ? typedAnswer.value
                    : Array.from(bank.querySelectorAll(".word"), word => word.textContent).join(" ");
            }

            function showMode(nextMode) {
                mode = nextMode;
                dragPanel.hidden = mode !== "drag";
                typingPanel.hidden = mode !== "type";
                dragMode.setAttribute("aria-pressed", mode === "drag");
                typeMode.setAttribute("aria-pressed", mode === "type");
                typedAnswer.required = mode === "type";
                updateAnswer();
                if (mode === "type") typedAnswer.focus();
            }

            dragMode.addEventListener("click", () => showMode("drag"));
            typeMode.addEventListener("click", () => showMode("type"));
            typedAnswer.addEventListener("input", updateAnswer);
            answer.form.addEventListener("submit", updateAnswer);

            bank.addEventListener("dragstart", event => {
                dragged = event.target.closest(".word");
                if (!dragged) return;
                dragged.classList.add("dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", dragged.textContent);
            });

            bank.addEventListener("dragend", () => {
                if (dragged) dragged.classList.remove("dragging");
                dragged = null;
            });

            bank.addEventListener("dragover", event => event.preventDefault());

            bank.addEventListener("drop", event => {
                event.preventDefault();
                if (!dragged) return;
                const target = event.target.closest(".word");
                if (target && target !== dragged) {
                    target.before(dragged);
                } else if (!target) {
                    bank.append(dragged);
                }
                updateAnswer();
            });

            bank.addEventListener("keydown", event => {
                const word = event.target.closest(".word");
                if (!word) return;
                if (event.key === "ArrowLeft" && word.previousElementSibling) {
                    event.preventDefault();
                    word.previousElementSibling.before(word);
                } else if (event.key === "ArrowRight" && word.nextElementSibling) {
                    event.preventDefault();
                    word.nextElementSibling.after(word);
                } else {
                    return;
                }
                updateAnswer();
            });

            updateAnswer();
        }
    </script>
</body>
</html>`;
}
