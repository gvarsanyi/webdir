import { Address, VagueAddress } from '../webdir.type';
import { resolveHost } from './resolve-host';

export const defaultHost = 'localhost';
export const defaultPort = 8080;

/**
 * Turn vague address to explicit, unique IP+port list
 * @param vagueAddresses input
 * @return IP+port list
 */
export async function sanitizeAddresses(vagueAddresses?: VagueAddress): Promise<Address[]> {
  const uniqueAddresses: Address[] = [];
  const list = Array.isArray(vagueAddresses) ? vagueAddresses : [vagueAddresses];
  if (!list.length) {
    list.push({});
  }
  for (const address of list) {
    if (address && typeof address === 'object') {
      address.host = address.host || defaultHost;
      address.port = address.port || defaultPort;
      const ips = await resolveHost(address.host);
      for (const ip of ips) {
        if (!uniqueAddresses.find((uniqueAddress) => uniqueAddress.host === ip && uniqueAddress.port === address.port)) {
          uniqueAddresses.push({ host: ip, port: address.port });
        }
      }
    }
  }
  return uniqueAddresses;
}
