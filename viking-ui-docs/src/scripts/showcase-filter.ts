const initShowcaseFilter = (): void => {
  const search = document.getElementById('component-search') as HTMLInputElement | null;
  const categoryFilter = document.getElementById('component-category-filter') as HTMLSelectElement | null;
  const countEl = document.getElementById('component-search-count');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.component-card[data-component-id]'));
  const categories = Array.from(document.querySelectorAll<HTMLElement>('.showcase-category[data-category-id]'));

  if (!search || cards.length === 0) return;

  const normalize = (value: string): string => value.trim().toLowerCase();

  const update = (): void => {
    const query = normalize(search.value);
    const category = categoryFilter?.value ?? 'all';
    let visible = 0;

    cards.forEach((card) => {
      const haystack = normalize(
        [
          card.dataset.componentName ?? '',
          card.dataset.componentDescription ?? '',
          card.dataset.componentTags ?? '',
        ].join(' '),
      );
      const cardCategory = card.dataset.componentCategory ?? '';
      const matchesQuery = !query || haystack.includes(query);
      const matchesCategory = category === 'all' || cardCategory === category;
      const show = matchesQuery && matchesCategory;
      card.hidden = !show;
      if (show) visible += 1;
    });

    categories.forEach((section) => {
      const sectionCards = section.querySelectorAll<HTMLElement>('.component-card[data-component-id]');
      const hasVisible = Array.from(sectionCards).some((card) => !card.hidden);
      section.hidden = !hasVisible;
    });

    if (countEl) {
      countEl.textContent =
        query || category !== 'all'
          ? `${visible} of ${cards.length} components`
          : `${cards.length} components`;
    }
  };

  search.addEventListener('input', update);
  categoryFilter?.addEventListener('change', update);
  update();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShowcaseFilter);
} else {
  initShowcaseFilter();
}
