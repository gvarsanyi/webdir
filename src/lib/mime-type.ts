import mime from 'mime';
import { basename } from 'path';

/**
 * Get mime type for filename
 * @param filename input
 * @returns mime type
 */
export function mimeType(filename: string): string {
  try {
    return mime.getType(basename(filename)) || 'application/octet-stream';
  } catch (e) {
    return 'application/octet-stream';
  }
}
