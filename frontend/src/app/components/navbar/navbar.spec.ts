import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Navbar } from './navbar';

@Component({
  selector: 'viking-site-navbar',
  template: '',
  standalone: true,
})
class MockVikingSiteNavbar {}

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  const navigateToMarketingSite = vi.fn(async (): Promise<void> => undefined);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(false),
            logout: async (): Promise<void> => undefined,
            navigateToMarketingSite,
          },
        },
        {
          provide: ThemeService,
          useValue: {
            theme: signal<'light' | 'dark'>('dark'),
            toggleTheme: (): void => undefined,
          },
        },
      ],
    })
      .overrideComponent(Navbar, {
        set: { imports: [MockVikingSiteNavbar] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the authenticated handoff path for marketing navigation', () => {
    component.navigateToMarketing('https://dataengineeringformachinelearning.com/blog/');

    expect(navigateToMarketingSite).toHaveBeenCalledWith(
      'https://dataengineeringformachinelearning.com/blog/',
    );
  });
});
