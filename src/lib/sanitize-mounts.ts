import { normalize, resolve } from 'path';
import { Mount, VagueMount } from '../webdir.type';

/**
 * Sanitize vague mount spec(s). Adds defaults (`/` => `.`) if omitted
 * @param mount input
 * @return sanitized mount list
 */
export function sanitizeMounts(mount?: VagueMount): Mount[] {
  const mounts = (mount ? Array.isArray(mount) ? mount : [mount] : []).map(({ fsPath, urlPath }) => ({
    fsPath: resolve((typeof fsPath === 'string' && fsPath) || process.cwd()),
    urlPath: normalize((typeof urlPath === 'string' && urlPath[0] === '/' ? urlPath : '/')).replace(/\\/g, '/')
  }));
  !mounts.length && mounts.push({ fsPath: process.cwd(), urlPath: '/' });
  return mounts;
}
