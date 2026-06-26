import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-siem',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './siem.html',
  styleUrls: ['./siem.scss'],
})
export class SiemDashboard {
  incidents = [
    {
      id: 'INC-9482',
      title: 'Suspicious API Key Usage',
      severity: 'High',
      status: 'Open',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      description: 'Multiple predictions requested from Tor exit node IP.',
    },
    {
      id: 'INC-9481',
      title: 'Potential Prompt Injection',
      severity: 'Medium',
      status: 'Investigating',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      description: 'System prompt override detected on /predict/llm endpoint.',
    },
  ];

  playbooks = [
    {
      id: 'PB-001',
      name: 'Revoke Compromised API Key',
      is_active: true,
      description: 'Automatically revoke API keys if abused from blacklisted Tor nodes.',
    },
    {
      id: 'PB-002',
      name: 'Block HTTP Flood',
      is_active: true,
      description: 'Webhook to Cloudflare WAF to null-route IPs exceeding 1000 req/min.',
    },
  ];
}
