# Wortspiel

Practice reconstructing German sentences from jumbled words.

## Play in a browser

Start with the default settings (4 sentences, up to 4 words per sentence, on
port 8080):

```sh
make play
```

Override the sentence count and maximum sentence length as needed:

```sh
make play words=8 max-words=6
```

Or start the web app directly:

```sh
uv run python src/web.py
```

The game opens at `http://127.0.0.1:8000` when run directly, or
`http://127.0.0.1:8080` with `make play`. Enter the correct German sentence to
move to the next row, or use the **Hint** and **Translation** buttons. Choose
**Drag words** to drag the tiles into the correct order (or focus a tile and use
the arrow keys), or **Type answer** to enter the sentence. Set the number beside
**Hint** to reveal that many words from the start of the sentence. Press `Ctrl+C`
in the terminal to stop the server.

Optional arguments:

```sh
uv run python src/web.py --words 10 --max-words 8 --port 8080
```

Use `--no-browser` to start the server without opening a browser automatically.

## Play in the terminal

From the `src` directory:

```python
from game import Game

Game(n=6)()
```

At the prompt, enter a German answer, `hint` (or `hint n` to reveal the first `n` words), or `translation`.
