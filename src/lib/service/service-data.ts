import { Server } from 'http';
import { Address, Mount } from '../../webdir.type';

/**
 * Service data container
 */
export class ServiceData {
  readonly mounts: Mount[] = [];
  listening = false;
  output = '';
  noIndex = false;
  singlePageApp = false;

  /**
   * Init container
   * @param address host and port
   * @param server HTTP server instance
   */
  constructor(readonly address: Address, readonly server: Server) {}
}
