words ?= 4
max-words ?= 4
DENO ?= $(if $(wildcard .deno/bin/deno),$(CURDIR)/.deno/bin/deno,deno)

.PHONY: play
play:
	cd web && $(DENO) task start --words $(words) --max-words $(max-words) --port 8080
