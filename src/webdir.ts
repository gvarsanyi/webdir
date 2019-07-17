import { fork } from 'child_process';
import { statSync } from 'fs';
import { request } from 'http';
import minimist from 'minimist';
import { resolve, sep } from 'path';
import { cwd } from 'process';

import { ARG_ALIASES, ARG_BOOLEANS, DEFAULT_HOST, DEFAULT_PORT, IPV6_RX, MAX_PORT, OPS_CLOSE_ENDPOINT, OPS_STATUS_ENDPOINT } from './const';
import { AddressItem, resolveAddresses } from './host-resolution';
import { Server } from './server';
import { FG_RUN_INFO, HELP, VERSION_STR } from './text';

// configuration
const args = minimist(process.argv.slice(2), {alias: ARG_ALIASES, boolean: ARG_BOOLEANS});
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
  console.log(VERSION_STR);
  process.exit(0);
}
if (args.help) {
  console.log(HELP);
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
  const arg = String(args._[i]);
  const nextArgPort = +args._[i + 1];
  if (ops.hasOwnProperty(arg)) {
    ops[<OP>arg] = true;
  } else {
    let host = arg;
    let ipv6 = false;
    let port: number;
    if (arg.indexOf(']') > -1) {
      const parts = arg.split(']');
      host = parts[0].replace('[', '').trim();
      if (host.match(IPV6_RX)) {
        ipv6 = true;
        if (parts[1].indexOf(':') > -1) {
          port = +parts[1].replace(':', '').trim();
        }
      }
    } else if (host.match(IPV6_RX)) {
      ipv6 = true;
    } else if (+arg > 0 && +arg < MAX_PORT && Number.isInteger(+arg)) {
      host = DEFAULT_HOST;
      port = +arg;
    } else if (!ipv6 && arg.indexOf(':') > -1) {
      const parts = arg.split(':');
      host = parts[0] || DEFAULT_HOST;
      port = +parts[1];
    }
    if (!port && nextArgPort > 0 && nextArgPort < MAX_PORT && Number.isInteger(nextArgPort)) {
      port = nextArgPort;
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
          const child = fork(`${__dirname}${sep}webdir-bg.js`, forkArgs, {detached: true, stdio: 'ignore'});
          child.send(JSON.stringify({dir: args.dir, host, port: +portStr, modifier, addrStr}));
          child.on('message', (msg: boolean | string) => {
            if (msg === true) {
              console.log('[SERVER] Listening on:', addrStr);
            } else {
              console.error('[ERROR]', msg && typeof msg === 'string' ? msg : 'Unknown error', `(for: ${addrStr})`);
            }
            child.disconnect();
            child.unref();
          });
        } else {
          if (!count) {
            console.log(FG_RUN_INFO);
          }
          new Server(args.dir, host, +portStr, modifier, () => {
            console.log('[SERVER] Listening on:', addrStr);
          }, (err) => {
            console.error('[ERROR]', err.message || err || 'Unknown error', `(for: ${addrStr})`);
          }, () => {
            console.log('[CLOSED]', addrStr);
          });
        }
        count++;
      }
    }
  }
});
