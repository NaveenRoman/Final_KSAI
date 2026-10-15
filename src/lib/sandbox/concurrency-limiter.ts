/**
 * Concurrency Limiter for Sandbox Container Executions.
 * Prevents host resource exhaustion by capping concurrent container runs
 * and rejecting excess requests with capacity errors.
 */

const MAX_CONCURRENT_CONTAINERS = 10;
const MAX_QUEUE_DEPTH = 50;
const QUEUE_TIMEOUT_MS = 15000;

interface QueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
  timestamp: number;
}

class SandboxConcurrencyLimiter {
  private activeCount = 0;
  private queue: QueueItem[] = [];

  public async acquire(): Promise<() => void> {
    if (this.activeCount < MAX_CONCURRENT_CONTAINERS) {
      this.activeCount++;
      return this.createReleaseFn();
    }

    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      throw new Error(
        "Execution capacity reached: Too many concurrent executions in progress. Please retry in a few moments."
      );
    }

    return new Promise<() => void>((resolve, reject) => {
      const item: QueueItem = {
        resolve: () => {
          this.activeCount++;
          resolve(this.createReleaseFn());
        },
        reject,
        timestamp: Date.now(),
      };
      this.queue.push(item);

      setTimeout(() => {
        const idx = this.queue.indexOf(item);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new Error("Execution request timed out waiting in concurrency queue."));
        }
      }, QUEUE_TIMEOUT_MS);
    });
  }

  private createReleaseFn(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.dispatchNext();
    };
  }

  private dispatchNext(): void {
    if (this.activeCount < MAX_CONCURRENT_CONTAINERS && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  public getStatus() {
    return {
      active: this.activeCount,
      queued: this.queue.length,
      maxConcurrent: MAX_CONCURRENT_CONTAINERS,
    };
  }
}

export const sandboxLimiter = new SandboxConcurrencyLimiter();
