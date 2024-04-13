import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const scriptPath = fileURLToPath(import.meta.url);
export const root = resolve(dirname(scriptPath) + '/../..');
