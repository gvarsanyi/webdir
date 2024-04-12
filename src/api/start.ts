import { apiRequestWrap } from '../lib/api-request-wrap';
import { sanitizeOps } from '../lib/sanitize-ops';
import { sendServiceOps } from '../lib/send-service-ops';
import { startDetachedService } from '../lib/service/start-detached-service';
import { OpMount, VagueAddress, VagueOp, WebdirResult } from '../webdir.type';

/**
 * Start service(s)
 * If no mount op is provided, will default to URL `/` -> FS `.` (current working directory)
 * @param addressish host:port combination(s). Defaults to `localhost` and `8080` when omitted
 * @param ops initial settings: mount(s), noIndex, output, singlePageApp
 * @param config options: noIndex, output, singlePageApp,
 */
export async function start(addressish?: VagueAddress, ops?: VagueOp | VagueOp[]): Promise<WebdirResult> {
  const serviceOps = sanitizeOps(ops);
  if (!serviceOps.find((op: OpMount) => op.mount)) {
    serviceOps.push({
      mount: {
        fsPath: process.cwd(),
        urlPath: '/'
      }
    });
  }
  return apiRequestWrap(addressish, async (address) => {
    const startResult = await startDetachedService(address);
    if (!startResult.success) {
      return [startResult, ...serviceOps.map((op) => ({
        error: true,
        message: 'skipped',
        op,
        success: false
      }))];
    }
    return [startResult, ...(await sendServiceOps(address, serviceOps))];
  });
}
