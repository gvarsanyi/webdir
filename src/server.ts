import express, { Express } from 'express';
import { Server as HttpServer, createServer } from 'http';
import { sep } from 'path';
import serveIndex from 'serve-index';

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
   */
  constructor(
    public readonly dir: string,
    public readonly host: string,
    public readonly port: number,
    public readonly modifier?: 'no-index' | 'single-page-application',
    startedCb?: () => void,
    errorCb?: (err: Error) => void
  ) {
    this.app = express();
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
  }
}
