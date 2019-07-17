import { Modifier, Server } from './server';

interface StartMsg {
  dir: string;
  host: string;
  port: number;
  modifier: Modifier;
}

process.on('message', (str: string) => {
  let msg: StartMsg;
  try { msg = JSON.parse(str); } catch (e) {}
  if (msg && msg.dir && msg.host && msg.port) {
    new Server(msg.dir, msg.host, msg.port, msg.modifier, () => {
      process.send(true);
    }, (err) => {
      process.send(err && typeof err.message === 'string' && err.message || String(err || 'Unkown error'));
    });
  }
});
