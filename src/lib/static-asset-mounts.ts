import { readdir } from 'fs';
import { resolve } from 'path';
import { Mount } from '../webdir.type';
import { root } from './root';

export const staticAssetMounts: Mount[] = [];

readdir(resolve(root + '/static'), (_err, files) => {
  (Array.isArray(files) ? files : []).forEach((file) => {
    staticAssetMounts.push({
      fsPath: resolve(root + '/static/' + file),
      urlPath: (file === 'favicon.ico' ? '/' : '/.webdir/') + file
    });
  });
});
