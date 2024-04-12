import { apiRequestWrap } from '../lib/api-request-wrap';
import { sanitizeOps } from '../lib/sanitize-ops';
import { sendServiceOps } from '../lib/send-service-ops';
import { VagueAddress, VagueOp, WebdirResult } from '../webdir.type';

/**
 * Update service(s)
 * @param addressish host:port combination(s). Defaults to `localhost` and `8080` when omitted
 * @param ops update(s): mount/unmount, noIndex, output, singlePageApp
 * @param config options: noIndex, output, singlePageApp,
 */
export async function update(addressish?: VagueAddress, ops?: VagueOp | VagueOp[]): Promise<WebdirResult> {
  const serviceOps = sanitizeOps(ops);
  return apiRequestWrap(addressish, async (address) => sendServiceOps(address, serviceOps));
}
