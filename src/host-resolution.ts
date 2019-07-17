import { lookup } from 'dns';
import { networkInterfaces } from 'os';

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

// tslint:disable-next-line: max-line-length
export const IPV6_RX = /(?:^|(?<=\s))(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(?=\s|$)/;

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
    if (!ifaces[address.host] || !ifaces[address.host].length) {
      addressList.push(address);
    } else {
      console.log(`[MAPPED] '${address.host}' => '${ifaces[address.host].map((iface) => iface.address).join(`' '`)}'`);
      for (const iface of ifaces[address.host]) {
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
