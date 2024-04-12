import { IncomingMessage, ServerResponse, createServer } from 'http';
import { Address } from '../../webdir.type';
import { ServiceData } from './service-data';
import { ServiceGet } from './service-get';
import { ServiceOpsHandler } from './service-ops-handler';

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
        const { method, url } = req;
        if (url === serviceControlPath && String(method).toUpperCase() === serviceControlMethod) {
          new ServiceOpsHandler(this.data, body, (json) => this.respond(res, 200, json));
        } else if (method === 'GET') {
          new ServiceGet(this.data, req.url, res);
        } else {
          this.respond(res, 500, 'server error');
        }
      } catch (e) {
        this.respond(res, 500, {
          error: true
        });
      }
    });
  };

  /**
   * HTTP response
   * @param res response object
   * @param statusCode response status
   * @param msg response explanation
   * @param contentType override
   */
  protected respond(res: ServerResponse & { _responded?: boolean }, statusCode: number, msg?: string | object, contentType?: string): void {
    if (!res['_responded']) {
      try {
        res['_responded'] = true;
        msg = !msg || typeof msg === 'string' ? msg : JSON.stringify(msg);
        (msg || contentType) && res.setHeader('Content-Type', contentType || (typeof msg === 'string' ? 'text/plain' : 'application/json'));
        res.statusCode = statusCode;
        msg && res.write(msg);
        res.end();
      } catch (e) {}
    }
  }
}
