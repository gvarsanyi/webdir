import { Address } from '../webdir.type';
import { defaultHost, defaultPort } from './sanitize-addresses';

/**
 * Turns address object into String
 * @param address input
 * @param urlPath if provided, will append the path, and prefix with protocol (http://)
 * @returns stringified address
 */
export function addressString(address: Address, urlPath?: string): string {
  const host = address.host && typeof address.host === 'string' ? address.host : defaultHost;
  const port = address.port > 0 && address.port < 65536 && address.port === parseInt(String(address.port), 10) ? address.port : defaultPort;
  return `${urlPath ? 'http://' : ''}${host.includes(':') ? `[${host}]` : host}:${port}${urlPath || ''}`;
}
