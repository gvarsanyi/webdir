import { Address, VagueAddress, WebdirResult } from '../webdir.type';
import { sanitizeAddresses } from './sanitize-addresses';

/**
 * Wraps atomic request operations and collects results
 * @param addressish vague address
 * @param cb processor for atomic ops
 * @returns combined results
 */
export async function apiRequestWrap(
  addressish: VagueAddress | undefined,
  cb: (address: Address) => Promise<WebdirResult['services'][number]['results']>
): Promise<WebdirResult> {
  const addresses = await sanitizeAddresses(addressish);
  const services = (await Promise.all(addresses.map(cb))).map((results, i) => ({ address: addresses[i], results }));
  const error = services.reduce<boolean>((aggr, item) => {
    return aggr || item.results.reduce<boolean>((aggr, item) => {
      return aggr || item.error;
    }, false);
  }, false);
  const success = services.reduce<'partial' | 'full' | undefined>((aggr, item) => {
    const subsuccess = item.results.reduce<'partial' | 'full' | undefined>((aggr, item) => {
      return item.success ? aggr === 'partial' ? aggr : 'full' : aggr ? 'partial' : undefined;
    }, undefined);
    return aggr === 'partial' ? aggr : subsuccess === 'full' ? aggr || subsuccess : subsuccess || aggr;
  }, undefined);
  const fullResult: WebdirResult = { services };
  error && (fullResult.error = error);
  success && (fullResult.success = success);
  return fullResult;
}
