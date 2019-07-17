import { networkInterfaces } from 'os';

import { DEFAULT_HOST, DEFAULT_PORT } from './const';

export const VERSION_STR = 'webdir v' + require('../package.json').version;

export const HELP = `${VERSION_STR}

Commands:
  webdir [start|stop|status] options [host] [host2]

Options:
  -d=PATH --dir=PATH            path to web root (defaults to current working directory)
  -h --help                     this help
  -n --no-index                 don't show directory index if index.html is missing in a folder
  -s --single-page-application  redirects all 404s to index.html of webroot
  -v --version                  version info

Host can be an interface name (${Object.keys(networkInterfaces()).join(' ')}), IP (both v4 and v6)
address or a hostname, but it must be bound to a local interface.
Use * to listen on all interfaces.
Default: ${DEFAULT_HOST}:${DEFAULT_PORT}`;

export const FG_RUN_INFO = `[INFO] Starting server on the foreground.
[INFO] To run as daemon, use the start/stop/status commands. Example:
[INFO]   webdir start ${process.argv.slice(2).join(' ')}`;
