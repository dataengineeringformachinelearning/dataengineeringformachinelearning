import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Compliance } from './compliance';
import { MlService } from '../../services/ml.service';
import { of } from 'rxjs';

describe('Compliance', () => {
  let component: Compliance;
  let fixture: ComponentFixture<Compliance>;
  let mlServiceMock: any;

  beforeEach(async () => {
    mlServiceMock = {
      fetchSocStatus: () =>
        of({
          status: 'success',
          overall_score: 0.8,
          criteria: [
            {
              name: 'End-to-End Encryption in Transit',
              category: 'Security',
              status: 'compliant',
              description: 'TLS active',
              details: 'TLS 1.3',
            },
          ],
        }),
      fetchStixReport: () =>
        of({
          type: 'bundle',
          id: 'bundle--123',
          objects: [],
        }),
      submitToIsac: (destination: string) =>
        of({
          status: 'success',
          message: 'Successfully submitted in sandbox mode.',
          submission_id: 'sub-abc-123',
          mode: 'sandbox',
          logs: ['Transmission completed'],
        }),
    };

    await TestBed.configureTestingModule({
      imports: [Compliance],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MlService, useValue: mlServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Compliance);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the compliance component', () => {
    expect(component).toBeTruthy();
  });

  it('should load SOC readiness criteria and score on init', () => {
    expect(component.socScore()).toBe(0.8);
    expect(component.socCriteria().length).toBe(1);
    expect(component.socCriteria()[0].name).toBe('End-to-End Encryption in Transit');
  });

  it('should support switching ISAC submission destination target', () => {
    component.changeIsacDestination('MS-ISAC');
    expect(component.selectedIsac()).toBe('MS-ISAC');
  });

  it('should submit threat intelligence and retrieve simulation logs', () => {
    component.submitThreatIntelligence();
    expect(component.isSubmittingIsac()).toBe(false);
    expect(component.submissionResult()).toBeTruthy();
    expect(component.submissionResult().status).toBe('success');
    expect(component.submissionResult().logs[0]).toBe('Transmission completed');
  });
});
