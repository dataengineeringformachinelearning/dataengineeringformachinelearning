import manifest from "../../../packages/viking-ui/viking.manifest.json";

/** Total component modules in viking.manifest.json (excluding shared `core` exports). */
export const LIBRARY_COMPONENT_COUNT = Object.keys(manifest.components).filter(
  (key) => key !== "core",
).length;

export const LIBRARY_PACKAGE = manifest.name;
