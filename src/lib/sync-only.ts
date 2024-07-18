
/** Sync-only mode indicator (for shutdown process) */
export let syncOnly = false;

/**
 * Turn on sync-only mode
 */
export function syncOnlyOn(): void {
  syncOnly = true;
}
