import tokensJson from "@dataengineeringformachinelearning/viking-ui/tokens.json";

export type TokenGroup = {
  id: string;
  label: string;
  tokens: { name: string; value: string; category?: string }[];
};

const flattenColors = (): TokenGroup => {
  const color = tokensJson.color as Record<
    string,
    Record<string, string> | string
  >;
  const entries: TokenGroup["tokens"] = [];

  for (const [group, values] of Object.entries(color)) {
    if (typeof values === "string") {
      entries.push({
        name: `--viking-${group}`,
        value: values,
        category: group,
      });
      continue;
    }
    for (const [shade, hex] of Object.entries(values)) {
      entries.push({
        name: `--viking-${group}-${shade}`,
        value: hex,
        category: group,
      });
    }
  }

  return { id: "color", label: "Color palette", tokens: entries };
};

const flattenSpacing = (): TokenGroup => {
  const spacing = tokensJson.spacing as Record<string, unknown>;
  const tokens: TokenGroup["tokens"] = [];

  for (const [key, value] of Object.entries(spacing)) {
    if (key === "description" || key === "deprecated") {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    if (key === "gridUnit") {
      tokens.push({
        name: "--viking-grid-unit",
        value,
        category: "spacing",
      });
      continue;
    }
    if (key === "spaceUnit") {
      tokens.push({
        name: "--viking-space-unit",
        value,
        category: "spacing",
      });
      continue;
    }
    tokens.push({
      name: `--viking-space-${key.replace(".", "-")}`,
      value,
      category: "spacing",
    });
  }

  return { id: "spacing", label: "Spacing (8px primary grid)", tokens };
};

const flattenTypography = (): TokenGroup => {
  const { fontSize, fontWeight, lineHeight, letterSpacing } =
    tokensJson.typography;
  const tokens: TokenGroup["tokens"] = [];

  for (const [key, value] of Object.entries(fontSize)) {
    tokens.push({
      name: `--viking-font-size-${key}`,
      value,
      category: "fontSize",
    });
  }
  for (const [key, value] of Object.entries(fontWeight)) {
    tokens.push({
      name: `--viking-font-weight-${key}`,
      value: String(value),
      category: "fontWeight",
    });
  }
  for (const [key, value] of Object.entries(lineHeight)) {
    tokens.push({
      name: `--viking-line-height-${key}`,
      value: String(value),
      category: "lineHeight",
    });
  }
  for (const [key, value] of Object.entries(letterSpacing)) {
    tokens.push({
      name: `--viking-letter-spacing-${key}`,
      value,
      category: "letterSpacing",
    });
  }

  return { id: "typography", label: "Typography", tokens };
};

const flattenRadius = (): TokenGroup => ({
  id: "radius",
  label: "Border radius",
  tokens: Object.entries(tokensJson.radius).map(([key, value]) => ({
    name: key === "DEFAULT" ? "--viking-radius" : `--viking-radius-${key}`,
    value,
    category: "radius",
  })),
});

const flattenSeries = (): TokenGroup => ({
  id: "series",
  label: "Chart series",
  tokens: Object.entries(tokensJson.series)
    .filter(([key]) => key !== "default")
    .map(([key, data]) => ({
      name: (data as { token: string }).token,
      value: (data as { hex: string }).hex,
      category: "series",
    })),
});

export const TOKEN_GROUPS: TokenGroup[] = [
  flattenColors(),
  flattenSpacing(),
  flattenTypography(),
  flattenRadius(),
  flattenSeries(),
];

export const SEMANTIC_TOKENS = [
  { name: "--viking-bg", role: "Page background" },
  { name: "--viking-surface", role: "Card / panel fill" },
  { name: "--viking-surface-alt", role: "Raised inset surfaces" },
  { name: "--viking-text", role: "Primary copy" },
  { name: "--viking-text-muted", role: "Secondary copy" },
  { name: "--viking-accent", role: "Primary action / teal" },
  { name: "--viking-accent-secondary", role: "Secondary accent / crimson" },
  { name: "--viking-border", role: "Machined metallic borders" },
  { name: "--viking-ring", role: "Focus ring (WCAG)" },
  { name: "--viking-success", role: "Stable / healthy states" },
  { name: "--viking-warning", role: "Threshold proximity" },
  { name: "--viking-danger", role: "Critical / anomaly" },
] as const;
