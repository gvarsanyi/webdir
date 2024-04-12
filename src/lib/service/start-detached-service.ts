import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { resolve } from 'path';
import { Address, OpStart, WebdirOpResult } from '../../webdir.type';

/**
 * Start `webdir-service`
 * @param address explicit host:port combination
 * @return result info
 */
export function startDetachedService(address: Address): Promise<WebdirOpResult> {
  return new Promise((cb?: (result: WebdirOpResult) => void) => {
    let timeout: NodeJS.Timeout | undefined;
    let service: ChildProcessWithoutNullStreams | undefined;
    const respond = (error?: string): void => {
      if (cb) {
        const op: OpStart = { start: true };
        cb(error ? {
          error: true,
          op,
          message: error,
          success: false
        } : {
          op,
          success: true
        });
        cb = undefined;
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
          try {
            service?.unref();
          } catch (e) {}
        }
      }
    };
    try {
      const script = 'webdir-service.' + process.argv[1].split('.').pop();
      service = spawn(process.argv[0], [script, address.host, String(address.port)], {
        cwd: resolve(__dirname + '/../..'),
        detached: true,
        stdio: 'pipe'
      });
      timeout = setTimeout(() => {
        try {
          service.unref();
        } catch (e) {}
      }, 5000);
      let stdout = '';
      service.stdout.on('data', (data) => {
        stdout += String(data);
        if (stdout.includes(`<webdir listening ${address.host} @ ${address.port}>`)) {
          respond();
        }
      });
      let stderr = '';
      service.stderr.on('data', (data) => {
        stderr += String(data);
        if (stderr.includes('EADDRINUSE')) {
          respond('address is already in use');
        }
      });
      service.on('exit', () => {
        respond('failed to start');
      });
    } catch (e) {
      respond(String(e.message || 'unknown error'));
    }
  });
}
