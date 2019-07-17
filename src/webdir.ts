import { fork } from 'child_process';
import { statSync } from 'fs';
import { request } from 'http';
import minimist from 'minimist';
import { networkInterfaces } from 'os';
import { resolve } from 'path';
import { cwd } from 'process';

import { AddressItem, IPV6_RX, resolveAddresses } from './host-resolution';
import { OPS_CLOSE_ENDPOINT, OPS_STATUS_ENDPOINT, Server } from './server';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 8080;
const MAX_PORT = 32768;

// configuration
const alias = {d: 'dir', h: 'help', n: 'no-index', s: 'single-page-application', v: 'version'};
const boolean = ['h', 'n', 's', 'v'];
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

if (args.version) {
  console.log('webdir v' + require('../package.json').version);
  process.exit(0);
}
if (args.help) {
  console.log(`webdir v${require('../package.json').version}

Commands:
webdir [start|stop|status] options [host] [host2]

Options:
  -d=PATH --dir=PATH            path to web root (defaults to current working directory)
  -h --help                     this help
  -n --no-index                 don't show directory index if index.html is missing in a folder
  -s --single-page-application  redirects all 404s to index.html of webroot
  -v --version                  version info

Host can be an interface name (${Object.keys(networkInterfaces()).join(' ')}), IP (both v4 and v6)
address or a hostname, but it must be bound to a local interface.`);
  process.exit(0);
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

if (!ops.stop && !ops.status) {
  console.log('[WEBDIR]', args.dir, modifier ? `(${modifier} mode)` : '');
}

resolveAddresses(addresses, (addressesSpec) => {
  if (!Object.keys(addressesSpec).length) {
    console.error('[ERROR] No specified host/port can be bound');
  } else {
    let count = 0;
    for (const [host, hostInfo] of Object.entries(addressesSpec)) {
      for (const [portStr, relatedAddresses] of Object.entries(hostInfo)) {
        const addrStr = relatedAddresses.map((addr) => `http://${addr}/`).join(' ');
        if (ops.status) {
          console.log('[REQUEST] Status:', addrStr);
          const req = request(`http://${relatedAddresses[0]}${OPS_STATUS_ENDPOINT}`, {method: 'POST'}, (res) => {
            if (res.statusCode === 200) {
              console.log('[STATUS] Server running');
            } else {
              console.error('[ERROR] Non-webdir server found');
            }
          });
          req.on('error', () => {
            console.log('[STATUS] Server not running');
          });
          req.end();
        } else if (ops.stop) {
          console.log('[REQUEST] Stopping:', addrStr);
          const req = request(`http://${relatedAddresses[0]}${OPS_CLOSE_ENDPOINT}`, {method: 'POST'}, (res) => {
            if (res.statusCode === 200) {
              console.log('[STATUS] Server closing');
            } else {
              console.error('[ERROR] Non-webdir server found');
            }
          });
          req.on('error', () => {
            console.log('[STATUS] Server was not running');
          });
          req.end();
        } else if (ops.start) {
          const forkArgs = [...(modifier ? ['--' + modifier] : []), '--dir=' + args.dir, ...addrStr.split(' ')];
          const child = fork('js/webdir-bg.js', forkArgs, {detached: true, stdio: 'ignore'});
          child.send(JSON.stringify({dir: args.dir, host, port: +portStr, modifier, addrStr}));
          child.on('message', (msg: string) => {
            if (msg && typeof msg === 'string') {
              if (msg.indexOf('[ERROR]') === 0) {
                console.error(msg);
              } else {
                console.log(msg);
              }
            }
            child.disconnect();
            child.unref();
          });
        } else {
          if (!count) {
            console.log(`[INFO] Starting server on the foreground. To run as daemon, use the start/stop/status commands. Example:
    webdir start ${process.argv.slice(2).join(' ')}`);
          }
          new Server(args.dir, host, +portStr, modifier, () => {
            console.log('[SERVER] Listening on:', addrStr);
          }, (err) => {
            console.error('[ERROR]', err.message || err || 'Unknown', addrStr);
          }, () => {
            console.log('[CLOSED]', addrStr);
          });
        }
        count++;
      }
    }
  }
});
