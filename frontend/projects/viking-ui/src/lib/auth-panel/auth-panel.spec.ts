import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { VikingAuthPanel } from './auth-panel';
import { VikingField } from '../field/field';
import { VikingInput } from '../input/input';

@Component({
  imports: [VikingAuthPanel, VikingField, VikingInput],
  template: `
    <viking-auth-panel
      title="Sign In"
      subtitle="Enter credentials"
      [showSocial]="true"
      [socialLoading]="loading"
      (googleSignIn)="onGoogle()"
      (appleSignIn)="onApple()"
    >
      <viking-field label="Email">
        <viking-input placeholder="Email" />
      </viking-field>
      <a vikingAuthLinks href="/forgot">Forgot password?</a>
      <p vikingAuthFooter>Need help?</p>
    </viking-auth-panel>
  `,
})
class AuthPanelHost {
  loading = false;
  googleCalled = false;
  appleCalled = false;
  onGoogle = (): void => {
    this.googleCalled = true;
  };
  onApple = (): void => {
    this.appleCalled = true;
  };
}

describe('viking-auth-panel', () => {
  const render = async (): Promise<ComponentFixture<AuthPanelHost>> => {
    const fixture = TestBed.createComponent(AuthPanelHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('renders accessible sign-in structure with title and subtitle', async () => {
    const fixture = await render();
    const panel = fixture.nativeElement.querySelector('.viking-auth-panel') as HTMLElement;
    expect(panel.getAttribute('aria-labelledby')).toBe('viking-auth-title');
    expect(fixture.nativeElement.querySelector('#viking-auth-title')?.textContent).toContain(
      'Sign In',
    );
    expect(fixture.nativeElement.querySelector('.viking-auth-subtitle')?.textContent).toContain(
      'Enter credentials',
    );
  });

  it('projects form body, links, and footer slots', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('viking-field')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[vikingAuthLinks]')?.textContent).toContain(
      'Forgot password?',
    );
    expect(fixture.nativeElement.querySelector('[vikingAuthFooter]')?.textContent).toContain(
      'Need help?',
    );
  });

  it('emits googleSignIn and appleSignIn from social buttons', async () => {
    const fixture = await render();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.viking-auth-social viking-button viking-button-wc',
    ) as NodeListOf<HTMLElement>;
    expect(buttons.length).toBe(2);
    buttons[0].dispatchEvent(
      new CustomEvent('viking-press', { bubbles: true, composed: true, detail: new MouseEvent('click') }),
    );
    buttons[1].dispatchEvent(
      new CustomEvent('viking-press', { bubbles: true, composed: true, detail: new MouseEvent('click') }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.googleCalled).toBe(true);
    expect(fixture.componentInstance.appleCalled).toBe(true);
  });

  it('hides social row when showSocial is false', async () => {
    @Component({
      imports: [VikingAuthPanel],
      template: `<viking-auth-panel title="Sign In" [showSocial]="false" />`,
    })
    class NoSocialHost {}

    const fixture = TestBed.createComponent(NoSocialHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.viking-auth-social')).toBeNull();
  });

  it('disables social buttons while socialLoading is true', async () => {
    @Component({
      imports: [VikingAuthPanel],
      template: `<viking-auth-panel title="Sign In" [socialLoading]="true" [showSocial]="true" />`,
    })
    class LoadingHost {}

    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.viking-auth-social viking-button viking-button-wc',
    ) as NodeListOf<HTMLElement>;
    expect(buttons[0].shadowRoot?.querySelector('button')?.disabled).toBe(true);
    expect(buttons[1].shadowRoot?.querySelector('button')?.disabled).toBe(true);
    expect(buttons[0].getAttribute('aria-busy')).toBe('true');
  });
});
