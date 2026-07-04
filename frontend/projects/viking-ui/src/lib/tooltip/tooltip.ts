import { DOCUMENT, Directive, ElementRef, Inject, OnDestroy, input } from '@angular/core';

let tooltipIdCounter = 0;

/**
 * vikingTooltip — attribute directive tooltip.
 * Shows on hover and keyboard focus; positions itself relative to the host.
 */
@Directive({
  selector: '[vikingTooltip]',
  host: {
    class: 'viking-tooltip-host viking-focus-ring',
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.aria-describedby]': 'visible() ? tooltipId : null',
  },
})
export class VikingTooltip implements OnDestroy {
  constructor(
    private readonly host: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  readonly vikingTooltip = input.required<string>();
  readonly tooltipPosition = input<'top' | 'bottom' | 'left' | 'right'>('top');
  readonly tooltipKbd = input<string>('');

  protected readonly tooltipId = `viking-tooltip-${++tooltipIdCounter}`;

  private element: HTMLElement | null = null;

  protected visible = (): boolean => this.element !== null;

  protected show = (): void => {
    if (this.element || !this.vikingTooltip()) {
      return;
    }
    const tip = this.document.createElement('div');
    tip.id = this.tooltipId;
    tip.setAttribute('role', 'tooltip');
    tip.className = 'viking-tooltip';

    const text = this.document.createElement('span');
    text.className = 'viking-tooltip-text';
    text.textContent = this.vikingTooltip();
    tip.appendChild(text);

    if (this.tooltipKbd()) {
      const kbd = this.document.createElement('kbd');
      kbd.className = 'viking-tooltip-kbd';
      kbd.textContent = this.tooltipKbd();
      tip.appendChild(kbd);
    }

    this.document.body.appendChild(tip);
    this.position(tip);
    this.element = tip;
  };

  private position = (tip: HTMLElement): void => {
    const anchor = this.host.nativeElement.getBoundingClientRect();
    const rect = tip.getBoundingClientRect();
    const gap =
      parseInt(
        getComputedStyle(this.document.documentElement).getPropertyValue('--viking-space-1'),
        10,
      ) || 8;
    const edge =
      parseInt(
        getComputedStyle(this.document.documentElement).getPropertyValue('--viking-space-1'),
        10,
      ) || 8;

    let left = anchor.left + anchor.width / 2 - rect.width / 2;
    let top = anchor.top - rect.height - gap;

    switch (this.tooltipPosition()) {
      case 'bottom':
        top = anchor.bottom + gap;
        break;
      case 'left':
        left = anchor.left - rect.width - gap;
        top = anchor.top + anchor.height / 2 - rect.height / 2;
        break;
      case 'right':
        left = anchor.right + gap;
        top = anchor.top + anchor.height / 2 - rect.height / 2;
        break;
      default:
        break;
    }

    tip.style.left = `${Math.max(edge, Math.min(left, window.innerWidth - rect.width - edge))}px`;
    tip.style.top = `${Math.max(edge, top)}px`;
  };

  protected hide = (): void => {
    this.element?.remove();
    this.element = null;
  };

  ngOnDestroy(): void {
    this.hide();
  }
}
