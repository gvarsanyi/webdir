import { appendFile, appendFileSync } from 'fs';
import { ServiceLogEntry } from '../../webdir.type';
import { addressString } from '../address-string';
import { syncOnly } from '../sync-only';
import { ServiceInfo } from './service-data';

const MAX_LOG_LENGTH = 100;

/**
 * Base class for logging service events
 */
export abstract class ServiceLog {
  protected abstract readonly info: ServiceInfo;

  private _logs: ServiceLogEntry[] = [];

  /**
   * Log event
   * @param msgParts message to log
   */
  log(...msgParts: any[]): void {
    this._logSubmit(false, msgParts.map((part) => String(part).trim()).join(' '));
  }

  /**
   * Log error event
   * @param msgParts message to log
   */
  logError(...msgParts: any[]): void {
    this._logSubmit(true, msgParts.map((part) => String(part).trim()).join(' '));
  }

  /**
   * Attach time, append to log cache, keep cache size sane, append to log file if needed
   * @param error indicate error log
   * @param msg log string
   */
  private _logSubmit(error: boolean, msg: string): void {
    const len = this._logs.length;
    const entry: ServiceLogEntry = {
      id: len ? this._logs[len - 1].id + 1 : 0,
      msg,
      t: Date.now()
    };
    if (error) {
      entry.error = true;
    }
    this._logPrint(entry);
    this._logs.push(entry);
    while (this._logs.length > MAX_LOG_LENGTH) {
      this._logs.shift();
    }
  }

  /**
   * Write log entry to STDOUT or STDERR
   * @param entry to output
   */
  private _logPrint(entry: ServiceLogEntry): void {
    let out = (new Date(entry.t)).toLocaleString() + ` <${addressString(this.info.address)}> ${entry.error ? 'ERROR ' : ''}${entry.msg}`;
    if (entry.error) {
      out += '\n' + (new Error).stack;
    }
    try {
      if (!this.info.detached) {
        console[entry.error ? 'error' : 'log'](out);
      }
    } catch (e) {}
    if (this.info.output) {
      try {
        if (syncOnly) {
          appendFileSync(this.info.output, out + '\n');
        } else {
          appendFile(this.info.output, out + '\n', () => {});
        }
      } catch (e) {}
    }
  }
}
