import { HelpRequested, parseTerminalArguments } from "./args.ts";
import { Game, Jumble } from "./game.ts";

export async function playTerminal(maxWords = 6, count = 1): Promise<void> {
  const game = await Game.create(maxWords, count);
  for (const row of game.rows) {
    const completed = playJumble(new Jumble(row.deu, row.eng));
    if (!completed) return;
  }
}

function playJumble(jumble: Jumble): boolean {
  while (!jumble.end) {
    console.log(jumble.jumble);
    const input = prompt("Deutsch (or 'hint [n]'/'translation'):");
    if (input === null) {
      console.log("\nGame ended.");
      return false;
    }

    const response = input.trim();
    const command = response.split(/\s+/);
    if (command[0]?.toLowerCase() === "hint") {
      const count = command.length === 2 ? Number(command[1]) : 1;
      if (
        (command.length !== 1 && command.length !== 2) ||
        !Number.isInteger(count) || count < 1
      ) {
        console.log("Use 'hint' or 'hint n' with a positive number of words.");
      } else {
        console.log("Hint:", jumble.hint(count).join(" "));
      }
      continue;
    }

    if (["translate", "translation"].includes(response.toLowerCase())) {
      console.log("Eng:", jumble.translate());
      continue;
    }

    const result = jumble.answer(response);
    console.log(result);
    if (jumble.end) console.log("Eng:", jumble.eng);
  }
  return true;
}

if (import.meta.main) {
  try {
    const options = parseTerminalArguments(Deno.args);
    await playTerminal(options.maxWords, options.words);
  } catch (error) {
    if (error instanceof HelpRequested) {
      console.log("Usage: deno task terminal [--words N --max-words N]");
    } else {
      console.error(error instanceof Error ? error.message : error);
      Deno.exitCode = 1;
    }
  }
}
