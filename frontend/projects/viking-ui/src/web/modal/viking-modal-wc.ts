import { attachShadowStyles, readBoolAttr } from '../core/base';

const VIKING_MODAL_STYLES = `
:host {
  display: contents;
}

.viking-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--viking-space-3);
  background: var(--viking-overlay-backdrop, rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-modal-panel {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2);
  width: min(522px, calc(100vw - var(--viking-space-4)));
  max-height: calc(100vh - var(--viking-space-6));
  padding: var(--viking-space-3);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-lg);
  font-family: var(--viking-font-family);
  position: relative;
  overflow: hidden;
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
}

.viking-modal-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
}

.viking-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--viking-space-2);
}

.viking-modal-heading {
  margin: 0;
  font-size: var(--viking-font-size-lg);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  border-radius: var(--viking-radius);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
}

.viking-modal-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-modal-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-modal-body {
  overflow-y: auto;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
  line-height: var(--viking-line-height-relaxed);
}

.viking-modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--viking-space-2);
  justify-content: flex-end;
}

.viking-modal-footer:empty {
  display: none;
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

/**
 * Framework-agnostic modal Web Component using native dialog semantics.
 * Tag: `viking-modal-wc`
 */
export class VikingModalWc extends HTMLElement {
  static readonly tag = 'viking-modal-wc';

  static get observedAttributes(): string[] {
    return ['open', 'title', 'dismissible'];
  }

  private readonly shadow: ShadowRoot;
  private dialogEl: HTMLDialogElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_MODAL_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncOpen();
    this.dialogEl?.addEventListener('close', this.onClose);
    this.dialogEl?.addEventListener('click', this.onBackdropClick);
  }

  disconnectedCallback(): void {
    this.dialogEl?.removeEventListener('close', this.onClose);
    this.dialogEl?.removeEventListener('click', this.onBackdropClick);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.syncOpen();
      this.updateTitle();
    }
  }

  private readonly onClose = (): void => {
    this.removeAttribute('open');
    this.dispatchEvent(
      new CustomEvent('viking-close', { bubbles: true, composed: true }),
    );
  };

  private readonly onBackdropClick = (event: MouseEvent): void => {
    if (!readBoolAttr(this, 'dismissible') && this.getAttribute('dismissible') !== null) return;
    if (event.target === this.dialogEl) {
      this.close();
    }
  };

  open(): void {
    this.setAttribute('open', '');
    this.syncOpen();
  }

  close(): void {
    this.removeAttribute('open');
    this.dialogEl?.close();
  }

  private syncOpen(): void {
    if (!this.dialogEl) return;
    const shouldOpen = this.hasAttribute('open');
    if (shouldOpen && !this.dialogEl.open) {
      this.dialogEl.showModal();
      queueMicrotask(() => {
        const closeBtn = this.shadow.querySelector<HTMLButtonElement>('.viking-modal-close');
        closeBtn?.focus();
      });
    } else if (!shouldOpen && this.dialogEl.open) {
      this.dialogEl.close();
    }
  }

  private updateTitle(): void {
    const title = this.getAttribute('title') ?? 'Dialog';
    const heading = this.shadow.querySelector('.viking-modal-heading');
    if (heading) heading.textContent = title;
    this.dialogEl?.setAttribute('aria-label', title);
  }

  private render(): void {
    const title = this.getAttribute('title') ?? 'Dialog';
    const dismissible = this.getAttribute('dismissible') !== 'false';

    this.shadow.innerHTML = `
      <dialog class="viking-modal-backdrop" aria-label="${title}" aria-modal="true">
        <div class="viking-modal-panel" part="panel">
          <header class="viking-modal-header" part="header">
            <h2 class="viking-modal-heading" part="title">${title}</h2>
            ${dismissible ? '<button type="button" class="viking-modal-close" part="close" aria-label="Close dialog">✕</button>' : ''}
          </header>
          <div class="viking-modal-body" part="body"><slot></slot></div>
          <footer class="viking-modal-footer" part="footer"><slot name="actions"></slot></footer>
        </div>
      </dialog>
    `;

    this.dialogEl = this.shadow.querySelector('dialog');
    const closeBtn = this.shadow.querySelector('.viking-modal-close');
    closeBtn?.addEventListener('click', () => this.close());
    this.dialogEl?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dismissible) {
        this.close();
      }
    });
  }
}

export const registerVikingModalWc = (): void => {
  if (!customElements.get(VikingModalWc.tag)) {
    customElements.define(VikingModalWc.tag, VikingModalWc);
  }
};
