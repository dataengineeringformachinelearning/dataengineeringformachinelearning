const XML_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
});

export const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => XML_ENTITIES[character] ?? "");
