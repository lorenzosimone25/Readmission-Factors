const STORAGE_KEY = 'readmission:magic-beta-v1';

export function loadMagicBetaEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMagicBetaEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore quota / private mode
  }
}
