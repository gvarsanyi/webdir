import { Address, ServiceOp, ServiceOpResult } from '../webdir.type';
import { httpRequest } from './http-request';

/**
 * Send HTTP request to a Webdir service
 * @param address data to send to service instance
 * @param ops data to send to service instance
 * @returns service response
 */
export async function sendServiceOps(address: Address, ops: ServiceOp[]): Promise<ServiceOpResult[]> {
  try {
    const [statusCode, raw] = await httpRequest('POST', address, '/.webdir', ops);
    const res = JSON.parse(raw.toString('utf8')) as { _webdir: true; results: ServiceOpResult[] };
    if (statusCode !== 200 || !res || typeof res !== 'object' || res._webdir !== true || !Array.isArray(res.results)) {
      throw new Error('invalid response');
    }
    return res.results;
  } catch (e) {
    return ops.map((op, i) => ({
      error: true,
      message: i ? 'skipped' : String(e.message || 'unknown error'),
      op,
      success: false
    }));
  }
}
