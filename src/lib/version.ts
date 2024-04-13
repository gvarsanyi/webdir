import { readFileSync } from 'fs';
import { root } from './root';

/**
 * Reads version from package.json
 * @returns version
 */
export function version(): string {
  try {
    const version = JSON.parse(readFileSync(root + '/package.json', 'utf8')).version;
    if (version) {
      return version;
    }
  } catch (e) {}
  return '_unknown_version_';
}
