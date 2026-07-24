import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusCard } from './status-card';

describe('StatusCard temporal inputs', () => {
  let fixture: ComponentFixture<StatusCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusCard] }).compileComponents();
    fixture = TestBed.createComponent(StatusCard);
    fixture.componentRef.setInput('page', {
      id: 'page-1',
      title: 'Example',
      slug: 'example',
      description: '',
      created_at: '2026-07-23T00:00:00Z',
      user_id: null,
      spiking_temporal_forecast: 12,
      temporal_status: 'ready',
      temporal_backend: 'norse_lif',
      temporal_sample_count: 128,
      temporal_scored_at: '2026-07-23T00:00:00Z',
      uses_norse: true,
    });
    fixture.detectChanges();
  });

  it('allows explicit null inputs to clear embedded temporal metadata', () => {
    fixture.componentRef.setInput('predictedTemporalForecast', null);
    fixture.componentRef.setInput('temporalStatus', 'insufficient_data');
    fixture.componentRef.setInput('temporalBackend', null);
    fixture.componentRef.setInput('temporalSampleCount', 3);
    fixture.componentRef.setInput('temporalScoredAt', null);
    fixture.componentRef.setInput('usesNorse', null);
    fixture.detectChanges();

    expect(fixture.componentInstance.temporalInsight()).toEqual({
      forecast: null,
      status: 'insufficient_data',
      backend: null,
      sampleCount: 3,
      scoredAt: null,
      usesNorse: null,
    });
    expect(fixture.componentInstance.predictedTemporalForecastValue()).toBe('—');
    expect(fixture.componentInstance.temporalEngineLabel()).toBe('Collecting telemetry');
  });
});
