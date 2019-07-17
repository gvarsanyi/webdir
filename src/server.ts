import express, { Express } from 'express';
import { Server as HttpServer, createServer } from 'http';
import { sep } from 'path';
import serveIndex from 'serve-index';

export const OPS_CLOSE_ENDPOINT = '/.special-CLOSE-OP-endp01nt';
export const OPS_STATUS_ENDPOINT = '/.special-STATUS-OP-endp01nt';

export type Modifier = 'no-index' | 'single-page-application';

/**
 * Webdir wrapper for Express / HTTP Server
 */
export class Server {
  /**
   * Express application
   */
  public readonly app: Express;

  /**
   * Low-level HTTP server
   */
  public readonly server: HttpServer;

  /**
   * Server initiation
   * @param dir path. Expected to be tested to actually be a directory
   * @param host IPv4 address, IPv6 address, domain name, or interface name
   * @param port numeric port for host
   * @param modifier special operation flags
   * @param startedCb 'listening' callback
   * @param errorCb 'error' callback
   * @param closeCb 'close' callback
   */
  constructor(
    public readonly dir: string,
    public readonly host: string,
    public readonly port: number,
    public readonly modifier?: Modifier,
    startedCb?: () => void,
    errorCb?: (err: Error) => void,
    closeCb?: () => void
  ) {
    this.app = express();

    this.app.post(OPS_CLOSE_ENDPOINT, (_req, res) => {
      res.sendStatus(200);
      this.server.close();
    });
    this.app.post(OPS_STATUS_ENDPOINT, (_req, res) => {
      res.sendStatus(200);
    });

    this.app.use('/', express.static(dir));
    if (!modifier) {
      this.app.use('/', serveIndex(dir, {icons: true}));
    }
    this.server = createServer(this.app);

    if (modifier === 'single-page-application') {
      this.app.get('*', (_req, res) => {
        res.sendFile(`${dir}${sep}index.html`);
      });
    }

    this.server.listen(+port, host, startedCb);
    errorCb && this.server.on('error', errorCb);
    closeCb && this.server.on('close', closeCb);
  }
}
