import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import {
  FluxAccordion,
  FluxAccordionItem,
  FluxBadge,
  FluxButton,
  FluxCalendar,
  FluxChart,
  FluxCheckbox,
  FluxHeading,
  FluxPagination,
  FluxProgress,
  FluxSelect,
  FluxSwitch,
  FluxToastService,
  FluxSelectOption,
} from './public-api';

@Component({
  imports: [FluxCheckbox, FormsModule],
  template: `<flux-checkbox [(ngModel)]="accepted">Accept</flux-checkbox>`,
})
class CheckboxHost {
  accepted = false;
}

@Component({
  imports: [FluxSelect],
  template: `<flux-select
    [options]="options"
    [value]="value()"
    (valueChange)="value.set($event)"
  />`,
})
class SelectHost {
  readonly options: FluxSelectOption[] = [
    { label: 'Alpha', value: 'a' },
    { label: 'Beta', value: 'b' },
  ];
  readonly value = signal<unknown>(null);
}

describe('flux-material', () => {
  const render = async <T>(component: new () => T): Promise<ComponentFixture<T>> => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('renders button variants with accessible focus and disabled semantics', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxButton);
    fixture.componentRef.setInput('variant', 'primary');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('flux-primary')).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('renders an anchor with rel guard when href and target are set', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxButton);
    fixture.componentRef.setInput('href', 'https://fluxui.dev');
    fixture.componentRef.setInput('target', '_blank');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('applies tone classes on badges', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxBadge);
    fixture.componentRef.setInput('tone', 'danger');
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('flux-badge-danger')).toBe(true);
  });

  it('exposes heading level via aria-level', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxHeading);
    fixture.componentRef.setInput('level', 2);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('aria-level')).toBe('2');
  });

  it('integrates checkbox with ngModel (ControlValueAccessor)', async (): Promise<void> => {
    const fixture = await render(CheckboxHost);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.accepted).toBe(true);
  });

  it('toggles switch state on change', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxSwitch);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it('opens the select listbox and picks an option', async (): Promise<void> => {
    const fixture = await render(SelectHost);
    const trigger = fixture.nativeElement.querySelector(
      '.flux-select-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('.flux-select-option');
    expect(options.length).toBe(2);
    (options[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('b');
  });

  it('windows pagination with ellipses for long ranges', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxPagination);
    fixture.componentRef.setInput('totalPages', 20);
    fixture.componentRef.setInput('page', 10);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('…');
    expect(text).toContain('10');
    expect(text).toContain('20');
  });

  it('clamps progress values into 0-100 and sets aria-valuenow', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxProgress);
    fixture.componentRef.setInput('value', 140);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('renders a 42-day calendar grid and selects a day', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxCalendar);
    fixture.detectChanges();
    const days = fixture.nativeElement.querySelectorAll('.flux-calendar-day');
    expect(days.length).toBe(42);
    (days[15] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('builds SVG paths for every chart series', async (): Promise<void> => {
    const fixture = TestBed.createComponent(FluxChart);
    fixture.componentRef.setInput('series', [
      { name: 'p50', data: [1, 2, 3] },
      { name: 'p95', tone: 'warning', data: [2, 4, 6] },
    ]);
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.flux-chart-line');
    expect(lines.length).toBe(2);
    expect((lines[0] as SVGPathElement).getAttribute('d')).toContain('M');
  });

  it('enforces exclusive accordion mode', async (): Promise<void> => {
    @Component({
      imports: [FluxAccordion, FluxAccordionItem],
      template: `
        <flux-accordion [exclusive]="true">
          <flux-accordion-item heading="One">First</flux-accordion-item>
          <flux-accordion-item heading="Two">Second</flux-accordion-item>
        </flux-accordion>
      `,
    })
    class AccordionHost {}

    const fixture = await render(AccordionHost);
    const triggers = fixture.nativeElement.querySelectorAll('.flux-accordion-trigger');
    (triggers[0] as HTMLElement).click();
    fixture.detectChanges();
    (triggers[1] as HTMLElement).click();
    fixture.detectChanges();
    const expanded = fixture.nativeElement.querySelectorAll('[aria-expanded="true"]');
    expect(expanded.length).toBe(1);
  });

  it('queues and auto-dismisses toasts via the service', (): void => {
    const service = TestBed.inject(FluxToastService);
    const id = service.show({ heading: 'Saved', text: 'All good', tone: 'success', duration: 0 });
    expect(service.toasts().length).toBe(1);
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });
});
