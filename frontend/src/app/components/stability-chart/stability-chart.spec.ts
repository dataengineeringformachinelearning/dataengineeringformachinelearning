import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StabilityChart } from './stability-chart';

describe('StabilityChart', () => {
  let component: StabilityChart;
  let fixture: ComponentFixture<StabilityChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StabilityChart],
    }).compileComponents();

    fixture = TestBed.createComponent(StabilityChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
