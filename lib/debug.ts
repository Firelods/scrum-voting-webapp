/**
 * Debug utility for Jira Bridge
 * Logs are only shown when debug mode is enabled
 */

// Check if debug mode is enabled (from localStorage or extension storage)
let debugEnabled = false;

// Initialize debug mode from storage
if (typeof window !== 'undefined' && window.localStorage) {
  debugEnabled = localStorage.getItem('jira-bridge-debug') === 'true';
}

/**
 * Enable or disable debug mode
 */
export function setDebugMode(enabled: boolean): void {
  debugEnabled = enabled;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('jira-bridge-debug', String(enabled));
  }
  if (enabled) {
    console.log('[JiraBridge] Debug mode enabled');
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return debugEnabled;
}

/**
 * Log a debug message (only if debug mode is enabled)
 */
export function debugLog(...args: unknown[]): void {
  if (debugEnabled) {
    console.log('[JiraBridge]', ...args);
  }
}

/**
 * Log a debug warning (only if debug mode is enabled)
 */
export function debugWarn(...args: unknown[]): void {
  if (debugEnabled) {
    console.warn('[JiraBridge]', ...args);
  }
}

/**
 * Log a debug error (always shown, but with prefix only in debug mode)
 */
export function debugError(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[JiraBridge]', ...args);
  } else {
    console.error(...args);
  }
}

// Expose to window for easy toggling from console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).JiraBridgeDebug = {
    enable: () => setDebugMode(true),
    disable: () => setDebugMode(false),
    isEnabled: () => isDebugMode(),
  };
}
