import { streamStatusStory } from './stream-status';

describe('streamStatusStory', () => {
  const base = {
    offline: false,
    streamActive: true,
    connected: false,
    paused: false,
    streamDegraded: false,
    metricsDegraded: false,
  };

  it('hides when the stream is not active', () => {
    const story = streamStatusStory({ ...base, streamActive: false });
    expect(story.visible).toBe(false);
    expect(story.pulse).toBe(false);
  });

  it('uses Updating + pulse only when connected', () => {
    const story = streamStatusStory({ ...base, connected: true });
    expect(story).toMatchObject({
      phase: 'updating',
      label: 'Updating',
      pulse: true,
      tone: 'accent',
      visible: true,
    });
    expect(story.label).not.toMatch(/Live/i);
  });

  it('prefers calm delayed over Live/degraded wording', () => {
    const story = streamStatusStory({ ...base, metricsDegraded: true });
    expect(story.phase).toBe('delayed');
    expect(story.label).toBe('Updates delayed');
    expect(story.pulse).toBe(false);
    expect(story.label).not.toMatch(/degraded|Live/i);
  });

  it('shows Paused without pulse when the tab is hidden', () => {
    const story = streamStatusStory({ ...base, paused: true, connected: false });
    expect(story).toMatchObject({
      phase: 'paused',
      label: 'Paused',
      pulse: false,
      tone: 'muted',
    });
  });

  it('shows Offline before delayed when the device is offline', () => {
    const story = streamStatusStory({
      ...base,
      offline: true,
      metricsDegraded: true,
    });
    expect(story.phase).toBe('offline');
    expect(story.label).toBe('Offline');
  });

  it('shows Connecting while the SSE lane is opening', () => {
    const story = streamStatusStory(base);
    expect(story).toMatchObject({
      phase: 'connecting',
      label: 'Connecting',
      pulse: false,
      visible: true,
    });
  });
});
