import { lookup } from 'dns/promises';
import { networkInterfaces } from 'os';
import { hostnameOrIP4orIP6Rx } from './hostname-or-ip4-or-ip6.rx';

/**
 * Get IPs for host
 * @param host local interface name, IPv4/6, or hostname
 * @returns list of resolved IPs
 */
export async function resolveHost(host: string): Promise<string[]> {
  const availableResolved: { [iface: string]: string[] } = {};
  if (String(host).match(hostnameOrIP4orIP6Rx)) {
    const ifaces = networkInterfaces();
    for (const [ifaceName, ifaceIPs] of Object.entries(ifaces)) {
      for (const info of ifaceIPs || []) {
        (availableResolved['*'] = availableResolved['*'] || []).push(info.address);
        (availableResolved[ifaceName] = availableResolved[ifaceName] || []).push(info.address);
        availableResolved[info.address] = [info.address];
      }
    }
  }
  const resolved = availableResolved[host] || [];
  try {
    if (!resolved.length && host) {
      const results = await lookup(host, { all: true });
      for (const result of results) {
        availableResolved[result?.address] && resolved.push(...availableResolved[result.address]);
      }
    }
  } catch (e) {}
  return resolved;
}
