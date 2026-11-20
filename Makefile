words ?= 4
max-words ?= 4

.PHONY: play
play:
	uv run python src/web.py --words $(words) --max-words $(max-words) --port 8080
