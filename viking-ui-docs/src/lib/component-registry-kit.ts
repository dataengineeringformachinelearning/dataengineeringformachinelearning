import type {
  ComponentSnippet,
  ShowcaseCategory,
  ShowcaseComponent,
} from "./component-registry";

export const defineSnippets = (
  angular: string,
  astro: string,
  django: string,
  javascript: string,
): ComponentSnippet => ({ angular, astro, django, javascript });

export const defineShowcaseComponent = (
  component: Omit<ShowcaseComponent, "snippets"> & {
    snippets?: Partial<ComponentSnippet>;
  },
  defaults: ComponentSnippet,
): ShowcaseComponent => ({
  ...component,
  snippets: { ...defaults, ...component.snippets },
});

export const defineShowcaseCategory = (
  category: ShowcaseCategory,
): ShowcaseCategory => category;

export const composeShowcaseCategories = (
  categories: ShowcaseCategory[],
): ShowcaseCategory[] => {
  assertUniqueIds(
    categories.map((category) => category.id),
    "category",
  );

  assertUniqueIds(
    categories.flatMap((category) =>
      category.components.map((component) => component.id),
    ),
    "component",
  );

  return categories;
};

const assertUniqueIds = (ids: string[], label: string): void => {
  const seen = new Set<string>();
  const duplicates = ids.filter((id) => {
    if (seen.has(id)) {
      return true;
    }

    seen.add(id);
    return false;
  });

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate Viking-UI showcase ${label} ids: ${duplicates.join(", ")}`,
    );
  }
};
