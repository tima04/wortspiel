export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertEquals(actual: unknown, expected: unknown): void {
  const equal = Object.is(actual, expected) ||
    (typeof actual === "object" && typeof expected === "object" &&
      JSON.stringify(actual) === JSON.stringify(expected));
  if (!equal) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export function assertStringIncludes(actual: string, expected: string): void {
  assert(
    actual.includes(expected),
    `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`,
  );
}

export async function assertRejects(
  action: () => unknown | Promise<unknown>,
  messageIncludes?: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (messageIncludes !== undefined) {
      const message = error instanceof Error ? error.message : String(error);
      assertStringIncludes(message, messageIncludes);
    }
    return;
  }
  throw new Error("Expected the action to throw");
}
