import { access, readdir as asyncReaddir, stat } from 'fs/promises';
import { join, normalize, resolve } from 'path';
import { fontIconHTML } from '../font-icon-html';
import { mimeType } from '../mime-type';
import { staticAssetMounts } from '../static-asset-mounts';
import { ServiceHandler } from './service-handler';

/**
 * Processes incoming HTTP GET request
 */
export class ServiceHandlerGET extends ServiceHandler {
  /**
   * Match URL to FS entry and serve result
   * NOTE: In case of conflict, files take precedence, mounts are processed in order
   */
  protected async process(): Promise<void> {
    const fsDirs = [];
    for (const mount of [...this.serviceData.mounts, ...staticAssetMounts]) {
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
    this.respondHTML(404, this.urlPath || '/', `<h1>404 - Not found</h1>\n<p>${this.urlPath || '/'}</p>\n`);
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
   * Respond with a file
   * @param fsDirs dir contents to serve
   */
  protected async respondDir(fsDirs: string[]): Promise<void> {
    if (this.serviceData.noIndex) {
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
      this.respondHTML(404, this.urlPath || '/', `<h1>404 - Not found</h1>\n<p>${this.urlPath || '/'}</p>\n`);
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
    this.respondHTML(200, this.urlPath || '/', `<h1>${urlPartsHTML}</h1>\n<div class="entries">${entriesHTML}</div>\n`);
  }
}
