/** Builds a stable unique-id factory (shared by vikingUid / forjdUid). */
export function createUidFactory(
  _namespace = "suite",
): (prefix: string) => string {
  let counter = 0;
  return (prefix: string): string => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

/** Generates a stable, unique DOM id for label/control associations. */
export const vikingUid = createUidFactory("viking");
