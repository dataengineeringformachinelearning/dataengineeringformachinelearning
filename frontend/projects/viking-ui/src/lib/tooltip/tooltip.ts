import { DOCUMENT, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

/**
 * fluxTooltip — attribute directive tooltip (https://fluxui.dev/components/tooltip).
 * Shows on hover and keyboard focus; positions itself relative to the host.
 */
@Directive({
  selector: '[fluxTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
  },
})
export class VikingTooltip implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  readonly fluxTooltip = input.required<string>();
  readonly tooltipPosition = input<'top' | 'bottom'>('top');
  readonly tooltipKbd = input<string>('');

  private element: HTMLElement | null = null;

  protected show = (): void => {
    if (this.element || !this.fluxTooltip()) {
      return;
    }
    const tip = this.document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.textContent = this.fluxTooltip();
    if (this.tooltipKbd()) {
      const kbd = this.document.createElement('kbd');
      kbd.textContent = this.tooltipKbd();
      kbd.style.cssText =
        'margin-left:9px;padding:0 5px;border:1px solid color-mix(in srgb, var(--viking-accent-content, #ffffff) 35%, transparent);border-radius:5px;';
      tip.appendChild(kbd);
    }
    tip.style.cssText = [
      'position:fixed',
      'z-index:var(--viking-z-tooltip, 1200)',
      'background:var(--jet-black, #31393c)',
      'color:var(--white, #ffffff)',
      'font-family:var(--viking-font-family, Inter, sans-serif)',
      'font-size:var(--viking-font-size-ui, 14px)',
      'line-height:1.35',
      'padding:5px 9px',
      'border-radius:var(--viking-radius, 9px)',
      'border:1px solid var(--viking-border-strong, rgba(255,255,255,0.2))',
      'box-shadow:var(--viking-shadow-md)',
      'pointer-events:none',
      'max-width:315px',
      'white-space:normal',
    ].join(';');
    this.document.body.appendChild(tip);

    const anchor = this.host.nativeElement.getBoundingClientRect();
    const rect = tip.getBoundingClientRect();
    const left = Math.max(
      9,
      Math.min(anchor.left + anchor.width / 2 - rect.width / 2, window.innerWidth - rect.width - 9),
    );
    const top = this.tooltipPosition() === 'top' ? anchor.top - rect.height - 9 : anchor.bottom + 9;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(9, top)}px`;
    this.element = tip;
  };

  protected hide = (): void => {
    this.element?.remove();
    this.element = null;
  };

  ngOnDestroy(): void {
    this.hide();
  }
}
