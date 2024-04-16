import { OpMount, OpNoIndex, OpOutput, OpSinglePageApp, OpStatus, OpStop, OpUnmount, ServiceOp, ServiceOpResult } from '../../webdir.type';
import { ServiceHandler } from './service-handler';

/**
 * Processes incoming HTTP control requests op by op (maintaining order) and sends response
 */
export class ServiceHandlerPOST extends ServiceHandler {
  /**
   * Route request to method and handle errors
   **/
  async process(): Promise<void> {
    const ops = (this.requestJSON?._webdir === true && Array.isArray(this.requestJSON.ops) ? this.requestJSON.ops : []);
    if (!ops.length) {
      return this.respond(500, { error: true });
    }
    const results: ServiceOpResult[] = [];
    for (const op of ops) {
      try {
        const method = ('$' + Object.keys(op)[0]) as keyof this;
        if (typeof this[method] !== 'function') {
          throw new Error('Invalid op');
        }
        results.push((this[method] as (op: ServiceOp) => ServiceOpResult)(op));
      } catch (e) {
        results.push({
          error: true,
          message: String(e.message),
          op,
          success: false
        });
      }
    }
    this.respond(200, { _webdir: true, results });
  }

  /**
   * Mount URL to FS
   * @param op incoming atomic request
   * @return op response
   */
  protected $mount(op: OpMount): ServiceOpResult {
    const mount = op.mount && typeof op.mount === 'object' ? op.mount : undefined;
    if (!mount || this.info.mounts.find(({ fsPath, urlPath }) => fsPath === mount.fsPath && urlPath === mount.urlPath)) {
      return this.opResult(op, false, undefined, 'already mounted');
    }
    this.info.mounts.push(mount);
    return this.opResult(op);
  }

  /**
   * Update noIndex mode
   * @param op incoming atomic request
   * @return op response
   */
  protected $noIndex(op: OpNoIndex): ServiceOpResult {
    if (!!op.noIndex !== !!this.info.noIndex) {
      this.info.noIndex = !!op.noIndex;
      return this.opResult(op);
    }
    return this.opResult(op, false, undefined, 'did not change');
  }

  /**
   * Update output (logging target)
   * @param op incoming atomic request
   * @return op response
   */
  protected $output(op: OpOutput): ServiceOpResult {
    if (typeof op.output === 'string' && op.output !== this.info.output) {
      this.info.output = op.output;
      return this.opResult(op);
    }
    return this.opResult(op, false, undefined, 'did not change');
  }

  /**
   * Update singlePageApp mode
   * @param op incoming atomic request
   * @return op response
   */
  protected $singlePageApp(op: OpSinglePageApp): ServiceOpResult {
    if (!!op.singlePageApp !== !!this.info.singlePageApp) {
      this.info.singlePageApp = !!op.singlePageApp;
      return this.opResult(op);
    }
    return this.opResult(op, false, undefined, 'did not change');
  }

  /**
   * Get service configuration
   * @param op incoming atomic request
   * @return op response
   */
  protected $status(op: OpStatus): ServiceOpResult {
    return {
      status: {
        mounts: this.info.mounts,
        noIndex: !!this.info.noIndex,
        output: typeof this.info.output === 'string' ? this.info.output : '',
        singlePageApp: !!this.info.singlePageApp
      },
      op,
      success: true
    };
  }

  /**
   * Stop service
   * @param op incoming atomic request
   * @return op response
   */
  protected $stop(op: OpStop): ServiceOpResult {
    setTimeout(() => {
      try {
        this.info.server.close();
        this.info.server.closeAllConnections();
      } catch (e) {}
      process.exit();
    }, 50);
    return this.opResult(op);
  }

  /**
   * Undo mount
   * @param op incoming atomic request
   * @return op response
   */
  protected $unmount(op: OpUnmount): ServiceOpResult {
    const mount = op.unmount && typeof op.unmount === 'object' ? op.unmount : undefined;
    const pos = mount && this.info.mounts.findIndex(({ fsPath, urlPath }) => fsPath === mount.fsPath && urlPath === mount.urlPath);
    if (pos > -1) {
      this.info.mounts.splice(pos, 1);
      return this.opResult(op);
    }
    return this.opResult(op, false, undefined, 'was not mounted');
  }

  /**
   * Standard op response
   * @param op input
   * @param success indicates accepted action
   * @param error indicates error
   * @param message explanation
   * @returns result
   */
  protected opResult(op: ServiceOp, success = true, error?: boolean, message?: string): ServiceOpResult {
    const response: ServiceOpResult = {
      op,
      success
    };
    error && (response.error = true);
    message && (response.message = message);
    return response;
  }
}
