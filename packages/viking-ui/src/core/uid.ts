let counter = 0;

/** Generates a stable, unique DOM id for label/control associations. */
export const vikingUid = (prefix: string): string => {
  counter += 1;
  return `${prefix}-${counter}`;
};
