import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
});
