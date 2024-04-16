import { IncomingMessage, ServerResponse, createServer } from 'http';
import { Address } from '../../webdir.type';
import { syncOnlyOn } from '../sync-only';
import { ServiceInfo } from './service-data';
import { ServiceHandlerGET } from './service-handler-get';
import { ServiceHandlerPOST } from './service-handler-post';
import { ServiceLog } from './service-log';

/**
 * Webdir HTTP server
 */
class Service extends ServiceLog {
  protected readonly info: ServiceInfo;

  /**
   * Start service
   * @param address listening on
   */
  constructor(address: Address) {
    super();
    const server = createServer();
    this.info = new ServiceInfo(address, server);
  }

  /** Start server */
  listen(): void {
    const { host, port } = this.info.address;
    const { server } = this.info;
    if (!host || !(port > 0 && port < 65536) || port !== parseInt(String(port), 10)) {
      this.logError('invalid host or port:', host, port);
      process.exit(1);
    }
    server.on('error', (e) => {
      this.logError('server', e.name, e.message);
      process.exit(1);
    });
    server.on('request', (req, res) => this.requestHandler(req, res));
    server.on('close', () => this.log(`server closed`));
    server.listen(port, host, () => {
      this.log(`<webdir listening ${host} @ ${port}>`);
      this.info.detached = true;
      this.info.listening = true;
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
    req.on('error', (e) => this.logError('request', req.method, req.url, e.name, e.message));
    req.on('end', () => {
      try {
        if (String(req.method).toUpperCase() === 'GET') {
          return new ServiceHandlerGET(this.info, req, res);
        }
        new ServiceHandlerPOST(this.info, req, res, body);
      } catch (e) {
        this.logError('request', req.method, req.url, e.name, e.message);
      }
    });
  };
}

export const service = new Service({
  host: process.argv[2],
  port: +process.argv[3]
});

// log any and all uncaught exceptions and exit
process.on('uncaughtException', (e) => {
  syncOnlyOn();
  service.logError(e?.name, e?.message, e.stack);
  process.exit(1);
});
