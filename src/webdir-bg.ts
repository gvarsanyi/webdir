import { Modifier, Server } from './server';

interface StartMsg {
  dir: string;
  host: string;
  port: number;
  modifier: Modifier;
  addrStr: string;
}

process.on('message', (str: string) => {
  let msg: StartMsg;
  try { msg = JSON.parse(str); } catch (e) {}
  if (msg && msg.dir && msg.host && msg.port && msg.addrStr) {
    new Server(msg.dir, msg.host, msg.port, msg.modifier, () => {
      process.send('[SERVER] Listening on: ' + msg.addrStr);
    }, (err) => {
      process.send(`[ERROR] ${err.message || err || 'Unknown'} ${msg.addrStr}`);
    });
  }
});
