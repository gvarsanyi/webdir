import { Service } from './lib/service/service';

const host = process.argv[2];
const port = +process.argv[3];

if (!host || !(port > 0 && port < 65536)) {
  throw new Error('Invalid host or port');
}

new Service({ host, port });
