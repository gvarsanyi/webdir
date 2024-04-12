import { Address, VagueMount, VagueOp } from '../webdir.type';
import { hostnameOrIP4orIP6Rx } from './hostname-or-ip4-or-ip6.rx';
import { defaultPort } from './sanitize-addresses';

/**
 * Collect CLI arguments (argv)
 * NOTE: throws error on invalid arguments
 * @param addressOnly determines which arguments to collect
 * @returns collected arguments
 */
export function cliArgs(addressOnly?: boolean): { addresses: Address[]; ops: VagueOp[]; } {
  try {
    const addresses: Address[] = [];
    const ops: VagueOp[] = [];
    const args = process.argv.slice(3);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i].trim();
      const saneArg = arg.toLowerCase().replace(/[-_]/g, '');
      if (saneArg === 'mount' || saneArg === 'unmount') {
        if (addressOnly) {
          throw new Error(`invalid argument: "${arg}"`);
        }
        const mount: VagueMount = {};
        ops.push(saneArg === 'mount' ? { mount } : { unmount: mount });
        const arg1 = (args[i + 1] || '')[0] !== '-' ? (args[i + 1] || '-') : '-';
        if (arg1[0] !== '-' && !['mount', 'unmount'].includes(arg1.trim().toLowerCase())) {
          mount.urlPath = arg1;
          i++;
          const arg2 = (args[i + 1] || '')[0] !== '-' ? (args[i + 1] || '-') : '-';
          if (arg2[0] !== '-' && !['mount', 'unmount'].includes(arg2.trim().toLowerCase())) {
            mount.fsPath = arg2;
            i++;
          }
        }
      } else if (arg[0] === '-') {
        if (addressOnly) {
          throw new Error(`invalid argument: "${arg}"`);
        } else if (['n', 'noindex'].includes(saneArg)) {
          ops.push({ noIndex: true });
        } else if (['index'].includes(saneArg)) {
          ops.push({ noIndex: false });
        } else if (['ns', 'sn'].includes(saneArg)) {
          ops.push({ noIndex: true });
          ops.push({ singlePageApp: true });
        } else if (['s', 'spa', 'singlepageapp', 'singlepageapplication'].includes(saneArg)) {
          ops.push({ singlePageApp: true });
        } else if (['nospa', 'nosinglepageapp', 'nosinglepageapplication'].includes(saneArg)) {
          ops.push({ singlePageApp: false });
        } else if (['o', 'output'].includes(saneArg.split('=')[0])) {
          ops.push({ output: arg.split('=')[1] || '' });
        } else if (['nooutput'].includes(saneArg)) {
          ops.push({ output: '' });
        } else {
          throw new Error(`invalid argument: "${arg}"`);
        }
      } else {
        let [host, ipv6, , portStr] = (arg.match(/^(http:\/\/)?(\[([0-9a-f:]+)\]|[^\s\:\[\]\\\/]*)(:([0-9]+))?/i) || []).slice(2);
        host = ipv6 || host;
        let port = +portStr;
        if (host.match(/^[\d]+$/)) {
          port = +host;
          host = undefined;
        }
        if (!(port > 0 && port < 65536) || port !== parseInt(String(port), 10)) {
          port = undefined;
        }
        if (!host || typeof host !== 'string') {
          host = undefined;
        }
        if (host || port) {
          addresses.push({ host, port });
        } else if (arg.match(hostnameOrIP4orIP6Rx)) {
          addresses.push({ host: arg, port: defaultPort });
        } else {
          throw new Error(`invalid address: "${arg}"`);
        }
      }
    }
    return { addresses, ops };
  } catch (e) {
    console.error(`webdir ERROR ${e.message || e}`);
    process.exit(1);
  }
}
