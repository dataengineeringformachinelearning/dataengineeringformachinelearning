export const initTokenInspector = (): void => {
  const search = document.getElementById('token-search') as HTMLInputElement | null;
  const groups = document.querySelectorAll('[data-token-group]');

  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    groups.forEach((group) => {
      let visible = 0;
      group.querySelectorAll('[data-token-row]').forEach((row) => {
        const name = row.getAttribute('data-token-name')?.toLowerCase() ?? '';
        const match = !q || name.includes(q);
        (row as HTMLElement).hidden = !match;
        if (match) visible += 1;
      });
      (group as HTMLElement).hidden = visible === 0;
    });
  });

  document.querySelectorAll('[data-copy-token]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const token = btn.getAttribute('data-copy-token');
      if (!token) return;
      try {
        await navigator.clipboard.writeText(token);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      } catch {
        /* noop */
      }
    });
  });
};

document.addEventListener('DOMContentLoaded', initTokenInspector);
