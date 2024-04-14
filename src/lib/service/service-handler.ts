import { createReadStream } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { normalize } from 'path';
import { ServiceOp } from '../../webdir.type';
import { mimeType } from '../mime-type';
import { ServiceData } from './service-data';

/**
 * Base class that stores req/res objects and offers various ways to respond
 */
export abstract class ServiceHandler {
  protected readonly method: string;
  protected readonly urlPath: string;
  protected readonly requestJSON?: { _webdir: true; ops: ServiceOp[]; };

  protected responseSent = false;

  /**
   * Init
   * @param serviceData reference to service data object
   * @param req incoming HTTP request object
   * @param res outgoing HTTP response object
   */
  constructor(
    protected readonly serviceData: ServiceData,
    protected readonly req: IncomingMessage,
    protected readonly res: ServerResponse,
    protected readonly requestBody = ''
  ) {
    try {
      this.method = String(this.req.method).toUpperCase();
      this.urlPath = normalize(req.url || '').replace(/\\/g, '/').replace(/[\/]+$/, '').split('?')[0]
        .split('/').map((part) => decodeURIComponent(part)).join('/');
      try {
        if (requestBody && requestBody.trim()[0] === '{') {
          this.requestJSON = JSON.parse(requestBody);
        }
      } catch (e) {}
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
      const stream = createReadStream(fsPath);
      this.res.writeHead(200, {
        'Content-Disposition': 'inline',
        'Content-Type': mimeType(fsPath)
      });
      stream.pipe(this.res);
    });
  }

  /**
   * Respond with plain text or JSON
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
      this.res.setHeader('Content-Type', json ? 'application/json' : 'text/plain');
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
    this.responseWrap(() => {
      this.res.statusCode = statusCode;
      this.res.setHeader('Content-Type', 'text/html');
      this.res.write(`<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Webdir ${title}</title>
            <link rel="stylesheet" href="/.webdir/directory-index.css">
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
        ${body.replace(/^/g, '            ')}  </body>
        </html>`.replace(/^\s{10}/g, ''));
      this.res.end();
    });
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
    } catch (e) {}
  }
}
