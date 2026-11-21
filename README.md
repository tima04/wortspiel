# Wortspiel

Practice reconstructing German sentences from jumbled words.

The TypeScript/Deno port is in [`web/`](web/). It uses no npm, JSR, or other
third-party packages: CSV parsing, gzip decompression, the HTTP server, and the
terminal UI all use built-in Deno and Web APIs. The Python version remains in
`src/` for reference.

## Requirements

- [Deno 2](https://deno.com/)
- The sentence data at `data/deu_eng_table.csv.gz`

## Play in a browser

Start with the default make settings (4 sentences, up to 4 words per sentence,
on port 8080):

```sh
make play
```

Override the sentence count and maximum sentence length as needed:

```sh
make play sentences=8 max-words=6
```

Or run the Deno app directly:

```sh
cd web
deno task start
```

The game opens at `http://127.0.0.1:8000` when run directly, or
`http://127.0.0.1:8080` with `make play`. Open the printed URL yourself. Enter
the correct German sentence to move to the next row, or use the **Hint** and
**Translation** buttons. Choose **Drag words** to drag the tiles into the
correct order (or focus a tile and use the arrow keys), or **Type answer** to
enter the sentence. Set the number beside **Hint** to reveal that many words
from the start of the sentence. Press `Ctrl+C` in the terminal to stop the
server.

Optional arguments:

```sh
cd web
deno task start --sentences 10 --max-words 8 --port 8080
```

On Linux, `deno task start:browser` additionally grants permission to run only
`xdg-open` and opens the browser automatically. The regular `start` task does
not need process-execution permission.

### Minimal permissions

`deno task start` grants only:

- `--allow-read=../data/deu_eng_table.csv.gz` — read the sentence data, not the
  rest of the filesystem;
- `--allow-net=127.0.0.1` — serve the game on the loopback interface only.

It grants no write, environment, system-information, FFI, package-download, or
process-execution access. The equivalent one-shot command, run from `web/`, is:

```sh
deno run \
  --allow-read=../data/deu_eng_table.csv.gz \
  --allow-net=127.0.0.1 \
  main.ts --no-browser
```

## Play in the terminal

```sh
cd web
deno task terminal
```

Use the same optional sentence arguments:

```sh
deno task terminal --sentences 6 --max-words 8
```

At the prompt, enter a German answer, `hint` (or `hint n` to reveal the first
`n` words), or `translation`. This task grants read access only to the sentence
data; it needs no network access.

## Checks and tests

The quality checks and tests also use no third-party dependencies and no Deno
runtime permissions:

```sh
cd web
deno task verify
```

You can run `deno fmt`, `deno lint`, `deno check main.ts terminal.ts`, and
`deno test` individually as well.
