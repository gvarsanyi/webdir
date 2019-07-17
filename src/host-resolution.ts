import { lookup } from 'dns';
import { NetworkInterfaceInfo, networkInterfaces } from 'os';

import { IPV6_RX } from './const';

export interface AddressItem {
  /** Address hostname */
  host: string;
  /** IPv6 marker. Only mark IPv6 IP addresses, never domains or interface names */
  ipv6?: boolean;
  /** Target port */
  port: number;
}

export interface AddressSpec {
  [host: string]: {
    [port: string]: string[];
  };
}

/**
 * Check addresses for being valid and local and unique. Also converts interface names to addresses
 * @param addresses list of address objects
 * @param cb async return with address specification
 */
export function resolveAddresses(addresses: AddressItem[], cb: (addressSpec: AddressSpec) => void): void {
  const ifaces = networkInterfaces();
  const localAddresses: string[] = [];
  for (const list of Object.values(ifaces)) {
    localAddresses.push(...list.map((info) => info.address));
  }

  const addressList: AddressItem[] = [];
  for (const address of addresses) {
    if (address.host !== '*' && !(ifaces[address.host] && ifaces[address.host].length)) {
      addressList.push(address);
    } else {
      const ifaceAddressList: NetworkInterfaceInfo[] = [];
      if (address.host === '*') {
        for (const list of Object.values(ifaces)) {
          ifaceAddressList.push(...(list || []));
        }
      } else {
        ifaceAddressList.push(...(ifaces[address.host] || []));
      }
      console.log(`[MAPPED] '${address.host}' => '${ifaceAddressList.map((iface) => iface.address).join(`' '`)}'`);
      for (const iface of ifaceAddressList) {
        addressList.push({host: iface.address, port: address.port, ipv6: iface.family === 'IPv6'});
      }
    }
  }

  const hosts = addressList.map((address) => address.host);

  const resolvedHosts: {[add: string]: string | false} = {};

  const addressSpec: AddressSpec = {};
  const len = hosts.length;
  if (!len) {
    cb(addressSpec);
    return;
  }

  let count = 0;
  const lookupCb = (): void => {
    count++;
    if (count === len) {
      for (const address of addressList) {
        const resolvedHost = <string>resolvedHosts[address.host];
        if (resolvedHost) {
          const desc = addressSpec[resolvedHost] = addressSpec[resolvedHost] || {};
          const hostAddr = `${resolvedHost.match(IPV6_RX) ? `[${resolvedHost}]` : resolvedHost}:${address.port}`;
          const extAddr = `${address.host.match(IPV6_RX) ? `[${address.host}]` : address.host}:${address.port}`;
          const list = desc[address.port] = desc[address.port] || [hostAddr];
          if (list.indexOf(extAddr) === -1) {
            list.push(extAddr);
          }
        }
      }
      cb(addressSpec);
    }
  };

  for (const host of hosts) {
    if (resolvedHosts.hasOwnProperty(host)) {
      setTimeout(lookupCb, 0);
    } else {
      lookup(host, {verbatim: true}, (err, resolved) => {
        if (err && !resolved) {
          console.error(`[WARN] Ignoring unresolved address '${host}'`, err.message || err);
          resolvedHosts[host] = false;
        } else if (localAddresses.indexOf(resolved) === -1) {
          console.error(`[WARN] Ignoring non-local address '${host}'`);
          resolvedHosts[host] = false;
        } else {
          resolvedHosts[host] = resolved;
        }
        lookupCb();
      });
    }
  }
}
