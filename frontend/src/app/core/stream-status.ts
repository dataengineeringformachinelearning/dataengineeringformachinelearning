/**
 * Calm stream / near-real-time status story for dashboard + analytics.
 *
 * Honest about the SSE-over-polled-projections lane: never claim "Live".
 * Pulse only when the browser is connected and receiving ticks.
 */

export type StreamStatusPhase =
  | 'idle'
  | 'connecting'
  | 'updating'
  | 'paused'
  | 'delayed'
  | 'offline';

export type StreamStatusTone = 'muted' | 'accent' | 'warning';

export type StreamStatusStory = {
  readonly phase: StreamStatusPhase;
  readonly label: string;
  readonly detail: string | null;
  readonly tone: StreamStatusTone;
  /** Pulse only when actively receiving updates — never on delayed/offline. */
  readonly pulse: boolean;
  readonly ariaLabel: string;
  /** Hide the chip when the stream has not been started. */
  readonly visible: boolean;
};

export function streamStatusStory(input: {
  readonly offline: boolean;
  readonly streamActive: boolean;
  readonly connected: boolean;
  readonly paused: boolean;
  readonly streamDegraded: boolean;
  readonly metricsDegraded: boolean;
}): StreamStatusStory {
  if (!input.streamActive) {
    return {
      phase: 'idle',
      label: 'Idle',
      detail: null,
      tone: 'muted',
      pulse: false,
      ariaLabel: 'Updates idle',
      visible: false,
    };
  }

  if (input.offline) {
    return {
      phase: 'offline',
      label: 'Offline',
      detail: 'Reconnect to resume near real-time updates.',
      tone: 'warning',
      pulse: false,
      ariaLabel: 'Updates offline',
      visible: true,
    };
  }

  // REST fallback or SSE degraded — calm, not alarming.
  if (input.metricsDegraded || input.streamDegraded) {
    return {
      phase: 'delayed',
      label: 'Updates delayed',
      detail: 'Showing the last successful view when possible.',
      tone: 'warning',
      pulse: false,
      ariaLabel: 'Updates delayed',
      visible: true,
    };
  }

  if (input.paused) {
    return {
      phase: 'paused',
      label: 'Paused',
      detail: 'Updates resume when this tab is visible.',
      tone: 'muted',
      pulse: false,
      ariaLabel: 'Updates paused',
      visible: true,
    };
  }

  if (input.connected) {
    return {
      phase: 'updating',
      label: 'Updating',
      detail: null,
      tone: 'accent',
      pulse: true,
      ariaLabel: 'Receiving near real-time updates',
      visible: true,
    };
  }

  return {
    phase: 'connecting',
    label: 'Connecting',
    detail: null,
    tone: 'muted',
    pulse: false,
    ariaLabel: 'Connecting to updates',
    visible: true,
  };
}
