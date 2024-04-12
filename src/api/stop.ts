import { apiRequestWrap } from '../lib/api-request-wrap';
import { sendServiceOps } from '../lib/send-service-ops';
import { VagueAddress, WebdirResult } from '../webdir.type';

/**
 * Stop service(s)
 * @param addressish host:port combination(s). Defaults to `localhost` and `8080` when omitted
 */
export async function stop(addressish?: VagueAddress): Promise<WebdirResult> {
  return apiRequestWrap(addressish, (address) => sendServiceOps(address, [{ stop: true }]));
}
