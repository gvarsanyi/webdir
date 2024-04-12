import { createReadStream, readdir } from 'fs';
import { access, readdir as asyncReaddir, stat } from 'fs/promises';
import { ServerResponse } from 'http';
import { join, normalize, resolve } from 'path';
import { Mount } from '../../webdir.type';
import { fontIconHTML } from '../font-icon-html';
import { mimeType } from '../mime-type';
import { ServiceData } from './service-data';

const assetDir = resolve(__dirname + '/../../../static');
const assetMounts: Mount[] = [];
readdir(assetDir, (_err, files) => (Array.isArray(files) ? files : []).forEach((file) =>
  assetMounts.push({
    fsPath: assetDir + '/' + file,
    urlPath: (file === 'favicon.ico' ? '/' : '/.webdir/') + file
  })));

/**
 * Processes incoming HTTP GET request
 */
export class ServiceGet {
  /**
   * Route request
   * @param serviceData reference to service data object
   * @param urlPath request URL path
   * @param res response object
   **/
  constructor(protected readonly serviceData: ServiceData, protected readonly urlPath: string, protected readonly res: ServerResponse) {
    this.urlPath = normalize(urlPath).replace(/\\/g, '/').replace(/[\/]+$/, '').split('?')[0]
      .split('/').map((part) => decodeURIComponent(part)).join('/');
    this.process();
  }

  /**
   * Match URL to FS entry and serve result
   * NOTE: In case of conflict, files take precedence, mounts are processed in order
   */
  protected async process(): Promise<void> {
    const fsDirs = [];
    for (const mount of [...this.serviceData.mounts, ...assetMounts]) {
      if ((this.urlPath + '/').startsWith(mount.urlPath + (mount.urlPath !== '/' ? '/' : ''))) {
        const fsPath = normalize(mount.fsPath + '/' + this.urlPath.substring(mount.urlPath.length)).replace(/[\\\/]+$/, '');
        const { mode } = await this.nodeType(fsPath);
        if (mode === 'file') {
          return this.respondFile(fsPath);
        }
        if (mode === 'dir') {
          fsDirs.push(fsPath);
        }
      }
    }
    if (fsDirs.length) {
      for (const dir of fsDirs) { // index.html check
        const indexPath = resolve(dir + '/index.html');
        if ((await this.nodeType(indexPath)).mode === 'file') {
          return this.respondFile(indexPath);
        }
      }
      return this.respondDir(fsDirs);
    }
    this.respond404();
  }

  /**
   * If accessible to read, determine FS node type
   * @param fsPath input
   */
  protected async nodeType(fsPath: string): Promise<{ mode?: 'dir' | 'file'; fileSize?: number }> {
    try {
      if (await access(fsPath).then(() => true, () => false)) {
        const stats = await stat(fsPath);
        return stats.isDirectory() ? { mode: 'dir' } : stats.isFile() ? {
          mode: 'file',
          fileSize: stats.size
        } : undefined;
      }
    } catch (e) {}
    return {};
  }

  /**
   * Send page 404
   */
  protected async respond404(): Promise<void> {
    if (this.serviceData.singlePageApp) { // redirect 404s to /index.html (if it exists)
      for (const mount of this.serviceData.mounts) {
        if (mount.urlPath === '/') {
          const fsPath = normalize(mount.fsPath + '/index.html').replace(/\\/g, '/').replace(/\/$/, '');
          const { mode } = await this.nodeType(fsPath);
          if (mode === 'file') {
            return this.respondFile(fsPath);
          }
        }
      }
    }
    const url = this.urlPath || '/';
    const res: ServerResponse & { _responded?: boolean } = this.res;
    if (!res['_responded']) {
      try {
        res['_responded'] = true;
        res.setHeader('Content-Type', 'text/html');
        res.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${url}</title>
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
    <h1>404 - Not found</h1>
    <p>${url}</p>
  </body>
</html>`);
        res.end();
      } catch (e) {}
    }
  }

  /** */
  protected respond500(): void {
    const res: ServerResponse & { _responded?: boolean } = this.res;
    if (!res['_responded']) {
      try {
        res['_responded'] = true;
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 500;
        res.write('500 - Server error');
        res.end();
      } catch (e) {}
    }
    res.end();
  }

  /**
   * Respond with a file
   * @param fsPath file to serve
   */
  protected async respondFile(fsPath: string): Promise<void> {
    const stream = createReadStream(fsPath);
    this.res.writeHead(200, {
      'Content-Disposition': 'inline',
      'Content-Type': mimeType(fsPath)
    });
    stream.pipe(this.res);
  }

  /**
   * Respond with a file
   * @param fsDirs dir contents to serve
   */
  protected async respondDir(fsDirs: string[]): Promise<void> {
    if (this.serviceData.noIndex) {
      return this.respond404();
    }
    const dirContents = await Promise.all(fsDirs.map((dir) => asyncReaddir(dir).catch(() => [])));
    const entryInfo: { [entry: string]: { fileSize?: number; fsPath: string; icon: string; mode: 'dir' | 'file'; mime?: string; } } = {};
    const len = dirContents.length;
    for (let i = 0; i < len; i++) {
      for (const entry of dirContents[i]) {
        if (!entryInfo[entry]) {
          const fsPath = resolve(fsDirs[i] + '/' + entry);
          const { mode, fileSize } = await this.nodeType(fsPath);
          if (mode) {
            entryInfo[entry] = {
              fileSize,
              fsPath,
              icon: fontIconHTML(mode, fsPath),
              mode,
              mime: mode === 'file' ? mimeType(fsPath) : undefined
            };
          }
        }
      }
    }
    const entries = Object.keys(entryInfo).sort((a, b) => {
      return entryInfo[a].mode !== entryInfo[b].mode ? entryInfo[a].mode === 'dir' ? -1 : 1 : a < b ? -1 : 1;
    });
    const res: ServerResponse & { _responded?: boolean } = this.res;
    if (!res['_responded']) {
      try {
        const urlParts = this.urlPath.split('/');
        const urlPartsHTML = urlParts.map((item, i) => {
          const href = urlParts.slice(0, i + 1).join('/') + '/';
          const slash = '<span class="url-slash">/</span>';
          return i === urlParts.length - 1 ?
            i ? `<span class="url-item current">${item}</span>` :
              `<span class="icon"><i class="fo fo-folder-closed"></i></span><span class="current">${slash}</span>` :
            i ? `<a class="url url-item" href="${href}">${item}</a>${slash}` :
              `<a class="url" href="${href}"><span class="icon"><i class="fo fo-folder-closed"></i></span>${slash}</a>`;
        }).join('');
        const entriesHTML = entries.map((entry) => {
          const { fileSize, icon, mode } = entryInfo[entry];
          const href = normalize(join(this.urlPath, entry));
          const fsize = fileSize >= 0 ? ('\n      <span class="fsize-hidden">' + fileSize.toLocaleString('en') + 'b</span>' +
            '\n      <span class="fsize">' + fileSize.toLocaleString('en') + 'b</span>') : '';
          return `\n    <a class="entry${mode === 'dir' ? ' dir' : ''}" href="${href}">
            <span class="icon">
              ${icon}
            </span>
            ${entry}${mode === 'dir' ? '/' : ''}${fsize}
          </a>`;
        }).join('') + (entries.length ? '' : '<span class="no-entry">(empty directory)</span>');
        const url = this.urlPath || '/';
        res['_responded'] = true;
        res.setHeader('Content-Type', 'text/html');
        res.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${url}</title>
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
    <h1>${urlPartsHTML}</h1>
    <div class="entries">${entriesHTML}</div>
  </body>
</html>`);
        res.end();
      } catch (e) {}
    }
  }
}
