import { Injectable, signal } from '@angular/core';
import { createClient, SanityClient } from '@sanity/client';
import { environment } from '../../environments/environment';

export interface SanityAnnouncement {
  _id: string;
  title: string;
  body: string;
  publishedAt: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SanityPlatformVideo {
  title: string;
  description?: string;
  videoUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class SanityService {
  private client: SanityClient;
  public announcements = signal<SanityAnnouncement[]>([]);
  public platformVideo = signal<SanityPlatformVideo | null>(null);
  public loading = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor() {
    this.client = createClient({
      projectId: environment.sanity.projectId,
      dataset: environment.sanity.dataset,
      useCdn: true,
      apiVersion: '2023-05-03',
    });
  }

  async fetchAnnouncements(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const query = `*[_type == "announcement"] | order(publishedAt desc) {
      _id,
      title,
      body,
      publishedAt,
      severity
    }`;

    try {
      const data = await this.client.fetch<SanityAnnouncement[]>(query);
      this.announcements.set(data || []);
      this.loading.set(false);
    } catch (err) {
      console.error('Error fetching Sanity announcements:', err);
      this.error.set('Failed to load system announcements.');
      this.loading.set(false);
    }
  }

  async fetchPlatformVideo(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const query = `*[_type == "platformVideo"] | order(publishedAt desc)[0] {
      title,
      description,
      "videoUrl": videoFile.asset->url
    }`;

    try {
      const data = await this.client.fetch<SanityPlatformVideo>(query);
      this.platformVideo.set(data || null);
      this.loading.set(false);
    } catch (err) {
      console.error('Error fetching Sanity platform video:', err);
      this.error.set('Failed to load platform video.');
      this.loading.set(false);
    }
  }
}
