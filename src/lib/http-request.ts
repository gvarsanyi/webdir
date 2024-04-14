import { request } from 'http';
import { Address, ServiceOp } from '../webdir.type';

/**
 * Promisified version of http.request
 * @param method HTTP method
 * @param address target service
 * @param path URL path
 * @param ops service control commands
 * @returns response body
 */
export async function httpRequest(method: 'GET' | 'POST', address: Address, path: string, ops?: ServiceOp[]): Promise<[number, Buffer]> {
  return new Promise<[number, Buffer]>(function(resolve, reject) {
    const requestBody = ops ? JSON.stringify({ _webdir: true, ops }) : '';
    const req = request({
      headers: requestBody ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody, 'utf8')
      } : {},
      host: address.host,
      method,
      path,
      port: address.port
    }, function(res) {
      if (res.statusCode! < 200 || res.statusCode! >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }
      let size = 0;
      const body: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        try {
          if (size < 4194304) { // 4Mb
            chunk = (typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
            size += chunk.length;
            body.push(chunk);
          }
        } catch (e) {}
      });
      res.on('end', function() {
        try {
          resolve([res.statusCode, Buffer.concat(body)]);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (e) => {
      if (String(e?.message).includes('fetch() URL is invalid') && address.host.includes(':') && !address.host.includes('[')) {
        const ipv6Address: Address = {
          host: `[${address.host}]`,
          port: address.port
        };
        return httpRequest(method, ipv6Address, path, ops).then(resolve).catch(reject);
      }
      reject(e?.name === 'ConnectionRefused' ? new Error('service not found') : e);
    });
    if (requestBody) {
      req.write(requestBody);
    }
    req.end();
  });
}
