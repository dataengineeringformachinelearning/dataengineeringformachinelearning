/** Official platform brand colors — exception for recognizable integration marks (same policy as Google/Apple in viking-icon). */
export const VIKING_INTEGRATION_BRAND_COLORS = {
  kubernetes: '#326CE5',
  tensorflow: '#FF6F00',
  pytorch: '#EE4C2C',
  'apache-spark': '#E25A1C',
  databricks: '#FF3621',
  'aws-redshift': '#8C4FFF',
} as const;

export type VikingIntegrationBrandName = keyof typeof VIKING_INTEGRATION_BRAND_COLORS;

export const VIKING_INTEGRATION_BRAND_NAMES = Object.keys(
  VIKING_INTEGRATION_BRAND_COLORS,
) as VikingIntegrationBrandName[];

export const isIntegrationBrandIcon = (name: string): name is VikingIntegrationBrandName =>
  (VIKING_INTEGRATION_BRAND_NAMES as readonly string[]).includes(name);

/**
 * Multi-path brand SVG markup (24×24 viewBox) — recognizable platform geometry.
 * Colors are official brand hues; same exception as Google/Apple OAuth marks.
 */
export const VIKING_INTEGRATION_BRAND_SVGS: Record<VikingIntegrationBrandName, string> = {
  kubernetes:
    '<path fill="#326CE5" d="M12 3.2 13.4 8h4.9l-4 2.9 1.5 4.9L12 13.4 8.2 15.8l1.5-4.9-4-2.9h4.9L12 3.2z"/><circle fill="#326CE5" cx="12" cy="12" r="2.1"/>',
  tensorflow:
    '<rect fill="#FF6F00" x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect fill="#FFA800" x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect fill="#424242" x="8.5" y="13.5" width="7" height="7" rx="1.2"/><path fill="#FF6F00" d="M7 7h4v2H9v4H7V7zm10 0h-2v6h-2v2h4V7z"/>',
  pytorch:
    '<path fill="#EE4C2C" d="M12 4.5c-1.8 2.6-3.5 4.4-3.5 6.8a3.5 3.5 0 0 0 7 0c0-2.4-1.7-4.2-3.5-6.8z"/><ellipse fill="#EE4C2C" cx="12" cy="16.5" rx="2.2" ry="3.2"/><circle fill="#FADBD2" cx="10.8" cy="10.2" r="1"/>',
  'apache-spark':
    '<path fill="#E25A1C" d="M12 2.5v3.8M12 17.7v3.8M2.5 12h3.8M17.7 12h3.8M5.4 5.4l2.7 2.7M15.9 15.9l2.7 2.7M18.6 5.4l-2.7 2.7M8.1 15.9l-2.7 2.7"/><polygon fill="#F7931E" points="12,8 15.5,14 8.5,14"/>',
  databricks:
    '<rect fill="#FF3621" x="4" y="5" width="16" height="3.5" rx="0.8"/><rect fill="#FF3621" x="4" y="10.25" width="16" height="3.5" rx="0.8"/><rect fill="#FF3621" x="4" y="15.5" width="16" height="3.5" rx="0.8"/><path fill="#FFFFFF" d="M8 6.75h8M8 12h8M8 17.25h8"/>',
  'aws-redshift':
    '<ellipse fill="#8C4FFF" cx="12" cy="7" rx="7.5" ry="2.8"/><path fill="#5A32B5" d="M4.5 7v9.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V7"/><ellipse fill="#8C4FFF" cx="12" cy="12" rx="7.5" ry="2.8" opacity="0.85"/><path fill="#FF9900" d="M15.5 11.5 12 14l-3.5-2.5 1-1.3L12 11.4l2.5-1.7 1 1.8z"/>',
};
