import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { EndpointsChart } from './endpoints-chart';

describe('EndpointsChart', () => {
  let component: EndpointsChart;
  let fixture: ComponentFixture<EndpointsChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndpointsChart],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(EndpointsChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
