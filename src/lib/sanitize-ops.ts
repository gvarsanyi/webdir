import { resolve } from 'path';
import { ServiceOp, VagueOp } from '../webdir.type';
import { sanitizeMounts } from './sanitize-mounts';

/**
 * Turn vague ops into explicit ones
 * @param vagueOps input
 * @return IP+port list
 */
export function sanitizeOps(vagueOps?: VagueOp | VagueOp[]): ServiceOp[] {
  const ops: ServiceOp[] = [];
  const list: VagueOp[] = Array.isArray(vagueOps) ? vagueOps : [vagueOps];
  for (const item of list) {
    if (item.mount) {
      ops.push(...sanitizeMounts(item.mount).map((mount) => ({ mount })));
    }
    if (item.unmount) {
      ops.push(...sanitizeMounts(item.unmount).map((mount) => ({ unmount: mount })));
    }
    if (typeof item.noIndex !== 'undefined') {
      ops.push({ noIndex: !!item.noIndex });
    }
    if (typeof item.singlePageApp !== 'undefined') {
      ops.push({ singlePageApp: !!item.singlePageApp });
    }
    if (typeof item.output !== 'undefined') {
      const output = typeof item.output === 'string' ? item.output.trim() : '';
      ops.push({ output: output ? resolve(output) : '' });
    }
  }
  return ops;
}
