import { Application, License, LogEntry, Reseller, DashboardStats } from './license';

// Mock data for the frontend demo
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

export const mockApps: Application[] = [
  { id: '1', name: 'CyberLoader Pro', description: 'Advanced loading tool for game modifications', suspended: false, kill_switch: false, created_at: daysAgo(90), total_licenses: 245, active_licenses: 189 },
  { id: '2', name: 'VaultCrack Suite', description: 'Security testing toolkit', suspended: false, kill_switch: false, created_at: daysAgo(60), total_licenses: 132, active_licenses: 98 },
  { id: '3', name: 'ShadowNet VPN', description: 'Private network client', suspended: true, kill_switch: false, created_at: daysAgo(120), total_licenses: 567, active_licenses: 0 },
  { id: '4', name: 'ByteForge IDE', description: 'Custom development environment', suspended: false, kill_switch: false, created_at: daysAgo(30), total_licenses: 78, active_licenses: 65 },
];

export const mockLicenses: License[] = [
  { id: '1', license_key: 'A91KD-92KLA-19ALD-19AL2-LA912', application_id: '1', application_name: 'CyberLoader Pro', hwid: 'HW-8A3F2B', ip: '192.168.1.42', created_at: daysAgo(30), expires_at: daysFromNow(30), banned: false, status: 'active', last_used: daysAgo(1) },
  { id: '2', license_key: 'B72KE-41PLM-83QWE-72NDS-PL831', application_id: '1', application_name: 'CyberLoader Pro', hwid: null, ip: null, created_at: daysAgo(5), expires_at: daysFromNow(25), banned: false, status: 'unused', last_used: null },
  { id: '3', license_key: 'C39LF-19KMN-47RTY-83BVC-MN472', application_id: '2', application_name: 'VaultCrack Suite', hwid: 'HW-1D9E4C', ip: '10.0.0.15', created_at: daysAgo(60), expires_at: daysAgo(2), banned: false, status: 'expired', last_used: daysAgo(3) },
  { id: '4', license_key: 'D84MG-73JKL-29UIO-45GHJ-JK293', application_id: '2', application_name: 'VaultCrack Suite', hwid: 'HW-5F2A8B', ip: '172.16.0.8', created_at: daysAgo(45), expires_at: daysFromNow(15), banned: true, status: 'banned', last_used: daysAgo(10) },
  { id: '5', license_key: 'E57NH-28IOP-61YUI-37DFG-IO618', application_id: '4', application_name: 'ByteForge IDE', hwid: 'HW-3C7D1E', ip: '192.168.0.100', created_at: daysAgo(10), expires_at: daysFromNow(50), banned: false, status: 'active', last_used: daysAgo(0) },
  { id: '6', license_key: 'F12PJ-84KLM-39QWE-91ASD-KL394', application_id: '1', application_name: 'CyberLoader Pro', hwid: 'HW-9B4E2F', ip: '10.10.10.5', created_at: daysAgo(20), expires_at: daysFromNow(40), banned: false, status: 'active', last_used: daysAgo(2) },
];

export const mockLogs: LogEntry[] = [
  { id: '1', license_key: 'A91KD-92KLA-19ALD-19AL2-LA912', application: 'CyberLoader Pro', action: 'License validated', ip: '192.168.1.42', hwid: 'HW-8A3F2B', timestamp: daysAgo(0) },
  { id: '2', license_key: 'E57NH-28IOP-61YUI-37DFG-IO618', application: 'ByteForge IDE', action: 'License validated', ip: '192.168.0.100', hwid: 'HW-3C7D1E', timestamp: daysAgo(0) },
  { id: '3', license_key: 'D84MG-73JKL-29UIO-45GHJ-JK293', application: 'VaultCrack Suite', action: 'License banned', ip: '172.16.0.8', hwid: 'HW-5F2A8B', timestamp: daysAgo(1) },
  { id: '4', license_key: 'F12PJ-84KLM-39QWE-91ASD-KL394', application: 'CyberLoader Pro', action: 'HWID bound', ip: '10.10.10.5', hwid: 'HW-9B4E2F', timestamp: daysAgo(2) },
  { id: '5', license_key: 'C39LF-19KMN-47RTY-83BVC-MN472', application: 'VaultCrack Suite', action: 'License expired', ip: '10.0.0.15', hwid: 'HW-1D9E4C', timestamp: daysAgo(2) },
  { id: '6', license_key: 'A91KD-92KLA-19ALD-19AL2-LA912', application: 'CyberLoader Pro', action: 'HWID reset', ip: '192.168.1.42', hwid: 'HW-8A3F2B', timestamp: daysAgo(3) },
];

export const mockResellers: Reseller[] = [
  { id: '1', username: 'reseller_alpha', email: 'alpha@resell.com', credits: 50, allowed_apps: ['1', '2'], created_at: daysAgo(60), total_generated: 124 },
  { id: '2', username: 'key_vendor', email: 'vendor@keys.com', credits: 15, allowed_apps: ['1'], created_at: daysAgo(30), total_generated: 45 },
  { id: '3', username: 'dist_master', email: 'master@dist.io', credits: 200, allowed_apps: ['1', '2', '4'], created_at: daysAgo(90), total_generated: 312 },
];

export const mockStats: DashboardStats = {
  totalApps: 4,
  totalLicenses: 1022,
  activeLicenses: 352,
  expiredLicenses: 489,
  bannedLicenses: 181,
  totalResellers: 3,
};
