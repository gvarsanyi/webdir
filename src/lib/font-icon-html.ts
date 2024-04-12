import { mimeType } from './mime-type';

const mimeIconAssoc: { [mime: string]: string } = {
  'image': 'file-image',
  'audio': 'file-audio',
  'video': 'file-video',
  'application/pdf': 'file-pdf',
  'application/msword': 'file-word',
  'application/vnd.ms-word': 'file-word',
  'application/vnd.oasis.opendocument.text': 'file-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml': 'file-word',
  'application/vnd.ms-excel': 'file-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml': 'file-excel',
  'application/vnd.oasis.opendocument.spreadsheet': 'file-excel',
  'application/vnd.ms-powerpoint': 'file-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml': 'file-powerpoint',
  'application/vnd.oasis.opendocument.presentation': 'file-powerpoint',
  'text/plain': 'file-text',
  'text/html': 'file-code',
  'application/json': 'file-code',
  'application/gzip': 'file-archive',
  'application/zip': 'file-archive'
};

/**
 * Get HTML code snippet for mime icon
 * @param mode dir/file
 * @param fsPath file
 * @returns HTML
 */
export function fontIconHTML(mode: 'dir' | 'file', fsPath: string): string {
  if (mode === 'dir') {
    return '<i class="fo fo-folder"></i>';
  } else if (mode === 'file') {
    const mime = mimeType(fsPath);
    if (mimeIconAssoc[mime]) {
      return `<i class="fo fo-${mimeIconAssoc[mime]}"></i>`;
    }
    const group = mime.split('/')[0];
    if (mimeIconAssoc[group]) {
      return `<i class="fo fo-${mimeIconAssoc[group]}"></i>`;
    }
  }
  return `<i class="fo fo-file"></i>`;
}
