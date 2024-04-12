import { OpMount, OpUnmount, ServiceOpResult, WebdirResult } from '../webdir.type';
import { addressString } from './address-string';

/**
 * CLI output for webdir request result
 * @param result info
 */
export function printResult(result: WebdirResult): void {
  for (const service of result.services) {
    for (const opResult of service.results) {
      const op = Object.keys(opResult.op)[0] || '?unknown-op';
      const mount = op === 'mount' ? (opResult.op as OpMount).mount : op === 'unmount' ? (opResult.op as OpUnmount).unmount : undefined;
      const { error, message, status, success } = opResult;
      let msg = error ? 'FAIL' : success ? 'DONE' : 'NOOP';
      const config = Object.keys(status && typeof status === 'object' ? status : {}).filter((key) => key !== 'mounts')
        .map((key: keyof ServiceOpResult['status']) => `${key}: ${typeof status[key] === 'boolean' ? status[key] : `"${status[key]}"`}`);
      msg += config.length ? ` (${config.join(', ')})` : '';
      msg += !success && mount && typeof mount === 'object' ? ` (url "${mount.urlPath}" to fs "${mount.fsPath}")` : '';
      msg += (message ? (msg ? ' ' : '') + message : '');
      const value = (op === 'noIndex' || op === 'singlePageApp' ? ((opResult.op as any)[op] ? ': on' : ': off') :
        (op === 'output' ? (opResult.op as any).output ? `: "${(opResult.op as any).output || ''}"` : ': off' : ''));
      const log = console[error ? 'error' : 'log'];
      log(`webdir <${addressString(service.address)}> ${op}${value} ${msg}`);
      if (success && mount && typeof mount === 'object') {
        log(`    ${addressString(service.address, mount.urlPath)} -> file://${mount.fsPath}`);
      }
      const mounts = status && typeof status === 'object' && Array.isArray(status.mounts) ? status.mounts : [];
      for (const mount of mounts) {
        log(`    ${addressString(service.address, mount.urlPath)} -> file://${mount.fsPath}`);
      }
    }
  }
}
