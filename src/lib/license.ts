// License key utility functions

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function generateLicenseKey(): string {
  const segments: string[] = [];
  for (let s = 0; s < 5; s++) {
    let segment = '';
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * CHARSET.length);
      segment += CHARSET[randomIndex];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

export function generateBulkKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateLicenseKey());
  }
  return keys;
}

export type LicenseStatus = 'active' | 'expired' | 'banned' | 'unused';

export interface License {
  id: string;
  license_key: string;
  application_id: string;
  application_name: string;
  hwid: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
  banned: boolean;
  status: LicenseStatus;
  last_used: string | null;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  suspended: boolean;
  kill_switch: boolean;
  created_at: string;
  total_licenses: number;
  active_licenses: number;
}

export interface Reseller {
  id: string;
  username: string;
  email: string;
  credits: number;
  allowed_apps: string[];
  created_at: string;
  total_generated: number;
}

export interface LogEntry {
  id: string;
  license_key: string;
  application: string;
  action: string;
  ip: string;
  hwid: string;
  timestamp: string;
}

export interface DashboardStats {
  totalApps: number;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  bannedLicenses: number;
  totalResellers: number;
}

export function getLicenseStatusColor(status: LicenseStatus): string {
  switch (status) {
    case 'active': return 'badge-active';
    case 'expired': return 'badge-expired';
    case 'banned': return 'badge-banned';
    case 'unused': return 'badge-suspended';
  }
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
