import { IncomingMessage, ServerResponse, createServer } from 'http';
import { Address } from '../../webdir.type';
import { ServiceData } from './service-data';
import { ServiceHandlerGET } from './service-handler-get';
import { ServiceHandlerPOST } from './service-handler-post';

export const serviceControlMethod = 'POST';
export const serviceControlPath = '/.webdir';

/**
 * Webdir HTTP server
 */
export class Service {
  protected readonly data: ServiceData;

  /**
   * Start service
   * @param address listening on
   */
  constructor(address: Address) {
    const server = createServer();
    this.data = new ServiceData(address, server);
    server.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });
    server.on('request', (req, res) => this.requestHandler(req, res));
    server.listen(address.port, address.host, () => {
      console.log(`<webdir listening ${address.host} @ ${address.port}>`);
      this.data.listening = true;
    });
  }

  /**
   * Handle incoming requests
   * @param req request
   * @param res response
   */
  protected requestHandler<T extends IncomingMessage>(req: T, res: ServerResponse<T>): void {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      try {
        if (Buffer.isBuffer(chunk)) {
          chunk = chunk.toString('utf8');
        }
        if (body.length < 4194304) { // 4Mb
          body += chunk;
        }
      } catch (e) {}
    });
    req.on('end', () => {
      try {
        if (String(req.method).toUpperCase() === 'GET') {
          return new ServiceHandlerGET(this.data, req, res);
        }
        new ServiceHandlerPOST(this.data, req, res, body);
      } catch (e) {}
    });
  };
}
