# AGENTS.md

## Project overview

Wortspiel is a small game for reconstructing German sentences from jumbled words.
The active implementation is a dependency-free TypeScript application for Deno 2 in
`web/`, with both browser and terminal interfaces. The Python implementation in
`src/` is retained as a behavioral reference; do not refactor or extend it unless
the task specifically concerns the Python version.

The application reads German/English sentence pairs from
`data/deu_eng_table.csv.gz`.

## Repository layout

- `web/data.ts`: streaming CSV parsing, sentence selection, and gzip data loading.
- `web/game.ts`: core `Jumble` and `Game` domain logic.
- `web/browser_game.ts`: state and actions for a browser game session.
- `web/page.ts`: server-rendered HTML, CSS, and inline browser JavaScript.
- `web/main.ts`: HTTP request handling and the local Deno server.
- `web/terminal.ts`: interactive terminal interface.
- `web/args.ts`: browser and terminal command-line parsing.
- `web/*_test.ts`: Deno tests using the built-in test runner.
- `web/test_asserts.ts`: local assertion helpers; there is no assertion dependency.
- `web/deno.json`: tasks, strict compiler options, and formatter settings.
- `src/`: older Python/pandas implementation and notebooks.
- `data/`: sentence datasets used by the application.
- `Makefile`: convenience target for starting the browser game.
- `README.md`: user-facing setup, gameplay, permissions, and check commands.

## Development commands

Run Deno commands from `web/` unless noted otherwise:

```sh
# Start the browser game without automatically opening a browser
deno task start

# Start with custom options
deno task start --sentences 10 --max-words 8 --port 8080

# Play in the terminal
deno task terminal --sentences 6 --max-words 8

# Run all required checks
deno task verify

# Run individual checks
deno task fmt --check
deno task lint
deno task check
deno task test

# Run a focused test file
deno test game_test.ts
```

From the repository root, `make play` starts the browser game on port 8080. Its
`sentences` and `max-words` variables can be overridden, for example:

```sh
make play sentences=8 max-words=6
```

There is no npm install or frontend build step. Run `deno task verify` after
changes to the Deno application; it performs formatting checks, linting, type
checking, and tests without runtime permissions.

## Implementation conventions

- Use only built-in Deno and Web APIs. Do not add npm, JSR, CDN, frontend
  framework, or other third-party dependencies without an explicit requirement.
- Keep TypeScript strict. `strict` and `noUncheckedIndexedAccess` are enabled;
  handle potentially missing array entries rather than silencing errors broadly.
- Use relative imports with explicit `.ts` extensions.
- Follow `deno fmt` style, including its configured 100-character line width.
  Prefer `deno task fmt` over hand-maintaining formatting.
- Preserve the existing module boundaries: data loading in `data.ts`, gameplay in
  `game.ts`, browser state in `browser_game.ts`, and transport/rendering concerns
  in their respective modules.
- Make small, focused changes and update all affected callers and tests when an
  interface changes.
- Keep the browser page self-contained. Inline CSS and browser JavaScript live in
  `page.ts`; continue escaping all dataset and game-message content with
  `escapeHtml` where appropriate.
- Preserve the case- and punctuation-sensitive answer behavior and whitespace
  normalization, including support for non-breaking spaces in source sentences.
- Use `src/` only as a reference for intended behavior. Avoid unrelated cleanup
  of its legacy style or notebooks.

## Data and runtime constraints

- The default CSV must contain `deu`, `eng`, and `nwords` columns. Sentence
  selection filters by `nwords <= maxWords` and samples without replacement.
- CSV handling supports quoted delimiters, escaped quotes, embedded newlines, and
  fields split across input chunks. Preserve streaming behavior and malformed
  input validation when changing the parser.
- Keep Deno permissions minimal and scoped in `web/deno.json`: the browser app
  reads only the sentence dataset and listens on loopback; the terminal app needs
  only dataset read access. Tests need no Deno permissions.
- Do not expand filesystem, network, process, environment, FFI, or other runtime
  permissions unless the feature genuinely requires it. Document any necessary
  permission or command changes in `README.md` and `web/deno.json`.
- Preserve HTTP safety measures in `main.ts`: loopback binding, request size
  limits, route/method validation, cross-site POST rejection, secure response
  headers, and HTML output escaping.

## Testing guidance

- Add or update `web/*_test.ts` files for behavior changes and regression fixes.
- Register tests with `Deno.test` and import assertions from
  `./test_asserts.ts`.
- Prefer deterministic tests: inject random sources, use in-memory sentence
  records and streams, and call `handleRequest` with constructed `Request`
  objects rather than opening sockets.
- Cover relevant edge cases, such as German Unicode text, punctuation, repeated
  words, irregular whitespace, CSV quoting/chunk boundaries, invalid arguments,
  completed-game state, and malformed or oversized requests.
- When changing browser controls or rendering, also manually exercise answer
  submission, hints, translation, restart, drag/keyboard reordering, and typed
  answers as applicable.

## Documentation

Keep `README.md` synchronized with user-visible behavior, defaults, command-line
options, task names, permissions, and verification commands. Update this file if
the project structure, development workflow, or conventions change.
