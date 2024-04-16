import { ReadStream, createReadStream } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { normalize } from 'path';
import { ServiceOp } from '../../webdir.type';
import { mimeType } from '../mime-type';
import { ServiceInfo } from './service-data';
import { ServiceLog } from './service-log';

/**
 * Base class that stores req/res objects and offers various ways to respond
 */
export abstract class ServiceHandler extends ServiceLog {
  protected readonly method: string;
  protected readonly urlPath: string;
  protected readonly requestJSON?: { _webdir: true; ops: ServiceOp[]; };

  protected responseSent = false;

  /**
   * Init
   * @param info reference to service data object
   * @param req incoming HTTP request object
   * @param res outgoing HTTP response object
   * @param requestBody incmoing request body as string
   */
  constructor(
    protected readonly info: ServiceInfo,
    protected readonly req: IncomingMessage,
    protected readonly res: ServerResponse,
    protected readonly requestBody = ''
  ) {
    super();
    try {
      this.log('request', req.method, req.url, requestBody);
      this.method = String(this.req.method).toUpperCase();
      this.urlPath = normalize(req.url || '').replace(/\\/g, '/').replace(/[\/]+$/, '').split('?')[0]
        .split('/').map((part) => decodeURIComponent(part)).join('/');
      try {
        if (requestBody && requestBody.trim()[0] === '{') {
          this.requestJSON = JSON.parse(requestBody);
        }
      } catch (e) {
        this.log('request body was not parsible as JSON');
      }
      setTimeout(() => this.process(), 1);
    } catch (e) {
      this.respond(500, 'Server error');
    }
  }

  protected abstract process(): Promise<void>;

  /**
   * Respond with a file
   * @param fsPath file to serve
   */
  protected async respondFile(fsPath: string): Promise<void> {
    this.responseWrap(() => {
      let stream: ReadStream;
      try {
        stream = createReadStream(fsPath);
      } catch (e) {
        return this.respond(404, '404 - Not found');
      }
      try {
        this.res.writeHead(200, {
          'Content-Disposition': 'inline',
          'Content-Type': mimeType(fsPath)
        });
      } catch (e) {
        this.logError('e1!', e);
      }
      this.log('stream file for', this.req.method, this.req.url, fsPath);
      try {
        stream.pipe(this.res);
      } catch (e) {
        this.logError('e2!', e);
      }
    });
  }

  /**
   * Respond with JSON or string (plain text or HTML)
   * @param statusCode HTTP response status code
   * @param body contents of <body>
   */
  protected respond(statusCode: number, body: string | object): void {
    this.responseWrap(() => {
      this.res.statusCode = statusCode;
      let msg = typeof body === 'string' ? body : '';
      let json = false;
      if (!msg) {
        try {
          msg = JSON.stringify(body);
          json = true;
        } catch (e) {
          msg = 'Server error';
        }
      }
      const len = Buffer.byteLength(msg, 'utf8');
      const logMsg = `response ${this.req.method} ${this.req.url} ${statusCode} ${json ? msg : (len + 'b')}`;
      statusCode >= 400 ? this.logError(logMsg) : this.log(logMsg);
      this.res.setHeader('Content-Type', json ? 'application/json' : msg.match(/^\s*\<\!DOCTYPE\s/) ? 'text/html' : 'text/plain');
      this.res.setHeader('Content-Length', len);
      this.res.write(msg);
      this.res.end();
    });
  }

  /**
   * Respond with HTML
   * @param statusCode HTTP response status code
   * @param title <title> content
   * @param body contents of <body>
   */
  protected respondHTML(statusCode: number, title: string, body: string): void {
    this.respond(statusCode, `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Webdir ${title}</title>
          <link rel="stylesheet" href="/.webdir/webdir.css">
        </head>
        <body>
        <script>
        try {
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.className = 'dark';
          }
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            try {
              document.body.className = event.matches ? 'dark' : '';
            } catch (e) {}
          });
        } catch (e) {}
        </script>
      ${body.replace(/^/g, '          ')}  </body>
      </html>`.replace(/^\s{8}/g, ''));
  }

  /**
   * Response checks
   * @param cb wrapped function
   */
  protected responseWrap(cb: () => void): void {
    try {
      if (!this.responseSent) {
        this.responseSent = true;
        cb();
      }
    } catch (e) {
      this.logError('e2!', e);
    }
  }
}
