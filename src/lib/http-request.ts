import { RequestOptions, request } from 'http';

/**
 * Promisified version of http.request
 * @param params request config
 * @param requestBody optional post data
 * @returns response body
 */
export async function httpRequest(params: RequestOptions, requestBody?: string): Promise<[number, Buffer]> {
  return new Promise<[number, Buffer]>(function(resolve, reject) {
    const req = request(params, function(res) {
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
      const host = String(params.host);
      if (String(e?.message).includes('fetch() URL is invalid') && host.includes(':') && !host.includes('[')) {
        params.host = `[${params.host}]`;
        return httpRequest(params, requestBody).then(resolve).catch(reject);
      }
      reject(e?.name === 'ConnectionRefused' ? new Error('service not found') : e);
    });
    if (requestBody) {
      req.write(requestBody);
    }
    req.end();
  });
}
