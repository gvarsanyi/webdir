import minimist from 'minimist';
import { readFileSync } from 'fs';
import { webdir } from './webdir';
import { Address, Mount, ServiceOptions } from './webdir.type';

const ops = ['help', 'run', 'start', 'status', 'stop', 'tail', 'version'] as const;
type Op = (typeof ops)[number];

/**
 * Webdir CLI features
 */
export class WebdirCLI {
  protected _addresses?: Address[];
  protected _args: minimist.ParsedArgs;
  protected _op: Op;

  /**
   * Webdir CLI parsing instance
   */
  constructor() {
    this[this.op]();
  }

  /**
   * Parse log output from CLI args
   */
  get output(): string | undefined {
    if (this.args.output != null) {
      if (!this.args.output && typeof this.args.output !== 'string') {
        console.error('value of argument "--output=" must be non-empty path string');
        process.exit(1);
      }
      return this.args.output;
    }
  }

  /**
   * Pre-parse CLI args via minimist
   */
  protected get args(): minimist.ParsedArgs {
    if (!this._args) {
      const argAliases: { [short: string]: string } = {};
      const booleanArgs: string[] = [this.op];
      if (['run', 'start'].includes(this.op)) {
        argAliases.d = 'dir';
        argAliases.n = 'no-index';
        argAliases.o = 'output';
        argAliases.s = 'single-page-application';
        argAliases.spa = 'single-page-application';
        booleanArgs.push('no-index', 'single-page-application');
      }
      this._args = minimist(process.argv.slice(2), {
        alias: argAliases,
        boolean: booleanArgs
      });
      const acceptedArgs = ['_', ...Object.keys(argAliases), ...Object.values(argAliases), this.op];
      const invalidArgs = Object.keys(this._args)
        .filter((arg) => !acceptedArgs.includes(arg))
        .map((arg) => `-${arg.length > 1 ? '-' : ''}${arg}`);
      if (invalidArgs.length) {
        console.error(`invalid argument${invalidArgs.length > 1 ? 's' : ''}: ${invalidArgs.join(' ')}`);
        process.exit(1);
      }
    }
    return this._args;
  }

  /**
   * Get host/port addresses from CLI args
   */
  protected get addresses(): Address[] {
    if (!this._addresses) {
      this._addresses = this.args._.filter((str) => str !== this.op).map((arg) => {
        let [host, ipv6, , portStr] = (String(arg).match(/^(http:\/\/)?(\[([0-9a-f:]+)\]|[^\s\:\[\]\\\/]*)(:([0-9]+))?/i) || []).slice(2);
        host = ipv6 || host;
        if (host.match(/^[\d]+$/)) {
          return { port: +host } as Address;
        }
        return { host, port: +portStr };
      });
    }
    return this._addresses;
  }

  /**
   * Pre-parse CLI args via minimist
   */
  protected get config(): ServiceOptions {
    const options = {} as ServiceOptions;
    if (this.args['output'] && typeof this.args['output'] === 'string') {
      options.output = this.args['output'];
    }
    if (this.args['no-index'] != null) {
      options.noIndex = !!this.args['no-index'];
    }
    if (this.args['single-page-application'] != null) {
      options.singlePageApp = !!this.args['single-page-application'];
    }
    return options;
  }

  /**
   * Get operation mode from CLI args
   */
  protected get op(): Op {
    if (!this._op) {
      this._op = ((process.argv.slice(2).map((arg) => {
        return (ops as readonly string[]).find((op) => {
          const lc = arg.toLowerCase();
          return (lc === op || lc === '--' + op || (op[0] !== 's' &&
            ((lc[0] === op[0] && op.length === 1) || (lc[0] === '-' + op[0] && op.length === 2))) ? op : undefined);
        });
      }).find((op) => op)) || 'run') as Op;
    }
    return this._op;
  }

  /**
   * Get local to URL associations from CLI args
   */
  protected get mounts(): Mount[] {
    const dirArgs = Array.isArray(this.args.dir) ? this.args.dir : typeof this.args.dir === 'string' ? [this.args.dir] : [];
    const mounts = dirArgs.map((str: string) => {
      if (typeof str !== 'string' || !str) {
        console.error('value of argument "--dir" must be a non-empty string. For details, run:\n  webdir help');
        process.exit(1);
      }
      let [urlPath, fsPath] = str.split(':');
      if (typeof fsPath === 'undefined') {
        fsPath = urlPath;
        urlPath = '/';
      }
      fsPath = fsPath || '.';
      return { urlPath, fsPath };
    });
    if (!mounts.length) {
      mounts.push({ urlPath: '/', fsPath: '.' });
    }
    return mounts;
  }

  /**
   * Print CLI help
   */
  protected help(): void {
    process.stdout.write('Manual for ');
    this.version();
    console.log(readFileSync(__dirname + '/../webdir-cli-help.txt', 'utf8'));
  }

  /**
   * Run webdir on the foreground
   */
  protected run(): void {
    // new Webdir({
    //   address: this.addresses,
    //   logOutput: this.logOutput,
    //   mount: this.mounts,
    //   noIndex: !!this.args['no-index'],
    //   singlePageApp: !!this.args['single-page-application']
    // });
  }

  /**
   * Run webdir in the background
   */
  protected async start(): Promise<void> {
    const { started, updated } = await start(this.addresses.length ? this.addresses : undefined, this.mounts, this.config);
    started.length && console.log(`started ${started.length} webdir service${started.length === 1 ? '' : 's'}\n`);
    started.forEach((status) => console.log(this.serviceInfoString(status)));
    updated.length && console.log(`updated ${updated.length} webdir service${updated.length === 1 ? '' : 's'}\n`);
    updated.forEach((status) => console.log(this.serviceInfoString(status)));
    if (!started.length && !updated.length) {
      console.error('failed to start webdir service');
      process.exit(1);
    }
  }

  /**
   * Fetch status of webdir services
   */
  protected async status(): Promise<void> {
    const { running } = await status(this.addresses.length ? this.addresses : undefined);
    console.log(`${running.length} active webdir service${running.length === 1 ? '' : 's'}\n`);
    if (!running.length) {
      process.exit(1);
    }
    running.forEach((status) => console.log(this.serviceInfoString(status)));
  }

  /**
   * Stop webdir service(s)
   */
  protected async stop(): Promise<void> {
    const { stopped } = await stop(this.addresses.length ? this.addresses : undefined);
    console.log(`${stopped.length} stopped webdir service${stopped.length === 1 ? '' : 's'}\n`);
    if (!stopped.length) {
      process.exit(1);
    }
    stopped.forEach((status) => console.log(this.serviceInfoString(status)));
  }

  /**
   * Tail webdir service(s)
   */
  protected async tail(): Promise<void> {

  }

  /**
   * Stringify ServerInfo
   * @param info data
   * @returns string
   */
  protected serviceInfoString(info: ServiceInfo): string {
    const mounts = info.mounts.map(({ fsPath, urlPath }) => `  mount (url, fs)\n    ${urlPath}\n    ${fsPath}\n`);
    return `service\n` +
      `  host ${info.address.host}\n` +
      `  port ${info.address.port}\n` +
      (mounts.length ? mounts.join('') : '  no url mounted\n') +
      `  ${info.output ? `log output\n    ${info.output}` : 'no log output'}\n` +
      `  dir index ${info.noIndex ? 'off' : 'on'}\n` +
      (info.singlePageApp ? '  single-page-app mode (404 redirects to "/")\n' : '');
  }

  /**
   * Print webdir version string
   */
  protected version(): void {
    console.log('webdir v' + require('../package.json').version);
  }
}

new WebdirCLI();
