export interface WebArguments {
  sentences: number;
  maxWords: number;
  port: number;
  noBrowser: boolean;
}

export interface TerminalArguments {
  sentences: number;
  maxWords: number;
}

function positiveInteger(value: string | undefined, option: string): number {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${option} requires a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${option} is too large`);
  return parsed;
}

function takeValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined) throw new Error(`${option} requires a value`);
  return value;
}

export function parseWebArguments(args: readonly string[]): WebArguments {
  let sentences = 6;
  let maxWords = 6;
  let port = 8000;
  let noBrowser = false;

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    switch (option) {
      case "--sentences":
        sentences = positiveInteger(takeValue(args, index, option), option);
        index += 1;
        break;
      case "--max-words":
        maxWords = positiveInteger(takeValue(args, index, option), option);
        index += 1;
        break;
      case "--port": {
        const value = takeValue(args, index, option);
        const parsed = positiveInteger(value, option);
        if (parsed > 65535) throw new Error("--port must be between 1 and 65535");
        port = parsed;
        index += 1;
        break;
      }
      case "--no-browser":
        noBrowser = true;
        break;
      case "--help":
      case "-h":
        throw new HelpRequested();
      default:
        throw new Error(`Unknown option: ${option}`);
    }
  }

  return { sentences, maxWords, port, noBrowser };
}

export function parseTerminalArguments(args: readonly string[]): TerminalArguments {
  let sentences = 1;
  let maxWords = 6;

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    switch (option) {
      case "--sentences":
        sentences = positiveInteger(takeValue(args, index, option), option);
        index += 1;
        break;
      case "--max-words":
        maxWords = positiveInteger(takeValue(args, index, option), option);
        index += 1;
        break;
      case "--help":
      case "-h":
        throw new HelpRequested();
      default:
        throw new Error(`Unknown option: ${option}`);
    }
  }

  return { sentences, maxWords };
}

export class HelpRequested extends Error {}
