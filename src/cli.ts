import { statSync } from 'fs';
import minimist from 'minimist';
import { resolve } from 'path';
import { cwd } from 'process';

import { AddressItem, IPV6_RX, resolveAddresses } from './host-resolution';
import { Server } from './server';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 8080;
const MAX_PORT = 32768;

// configuration
const alias = {d: 'dir', n: 'no-index', s: 'single-page-application'};
const boolean = ['n', 's'];
const args = minimist(process.argv.slice(2), {alias, boolean});
args.dir = resolve(args.dir || cwd());
try {
  const stat = statSync(args.dir);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`[ERROR] Not a directory: '${args.dir}`);
  }
} catch (e) {
  console.error(e && typeof e.message === 'string' && e.message.replace('ENOENT', '[ERROR]') || `[ERROR] Not a directory: '${args.dir}`);
  process.exit(1);
}

const modifier = args['single-page-application'] ? 'single-page-application' : args['no-index'] ? 'no-index' : null;

type OP = 'start' | 'stop' | 'status';

const ops: {[op in OP]: boolean} = {
  start: false,
  status: false,
  stop: false
};

const addresses: AddressItem[] = [];

const len = args._.length;
for (let i = 0; i < len; i++) {
  if (ops.hasOwnProperty(args._[i])) {
    ops[<OP>args._[i]] = true;
  } else {
    let host = args._[i];
    let ipv6 = false;
    let port: number;
    if (args._[i].indexOf(']') > -1) {
      const parts = args._[i].split(']');
      host = parts[0].replace('[', '').trim();
      if (host.match(IPV6_RX)) {
        ipv6 = true;
        if (parts[1].indexOf(':') > -1) {
          port = +parts[1].replace(':', '').trim();
        }
      }
    } else if (host.match(IPV6_RX)) {
      ipv6 = true;
    } else if (+args._[i] > 0 && +args._[i] < MAX_PORT && Number.isInteger(+args._[i])) {
      host = DEFAULT_HOST;
      port = +args._[i];
    } else if (!ipv6 && args._[i].indexOf(':') > -1) {
      const parts = args._[i].split(':');
      host = parts[0] || DEFAULT_HOST;
      port = +parts[1];
    }
    if (!port && +args._[i + 1] > 0 && +args._[i + 1] < MAX_PORT && Number.isInteger(+args._[i + 1])) {
      port = +args._[i + 1];
      i++;
    }
    port = port || DEFAULT_PORT;
    addresses.push({host, port, ipv6});
  }
}

if (!addresses.length) {
  addresses.push({host: DEFAULT_HOST, port: DEFAULT_PORT});
}

console.log('[WEBDIR]', args.dir, modifier ? `(${modifier} mode)` : '');

resolveAddresses(addresses, (addressesSpec) => {
  if (!Object.keys(addressesSpec).length) {
    console.error('[ERROR] No specified host/port can be bound');
  } else {
    for (const [host, hostInfo] of Object.entries(addressesSpec)) {
      for (const [portStr, relatedAddresses] of Object.entries(hostInfo)) {
        new Server(args.dir, host, +portStr, modifier, () => {
          console.log('[SERVER] Listening on:', ...relatedAddresses.map((addr) => `http://${addr}/`));
        }, (err) => {
          console.error('[ERROR] on', relatedAddresses.join(' & ') + ':', err.message || err);
        });
      }
    }
  }
});
