interface WorkerTask {
  id: string;
  type: 'jpeg' | 'jpeg-ls' | 'jpeg2000' | 'raw';
  buffer: ArrayBuffer;
  resolve: (result: Uint8ClampedArray) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private maxWorkers: number;

  constructor(maxWorkers = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = maxWorkers;
  }

  private createWorker(): Worker {
    const worker = new Worker(
      new URL('./image-decoder.worker.ts', import.meta.url)
    );

    worker.onmessage = (event) => {
      const { taskId, result, error } = event.data;
      const task = this.taskQueue.find(t => t.id === taskId);
      
      if (task) {
        if (error) {
          task.reject(new Error(error));
        } else {
          task.resolve(new Uint8ClampedArray(result));
        }
        
        this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
        this.busyWorkers.delete(worker);
        this.processNextTask();
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.busyWorkers.delete(worker);
      this.workers = this.workers.filter(w => w !== worker);
      this.processNextTask();
    };

    return worker;
  }

  private getIdleWorker(): Worker {
    // Find existing idle worker
    const idleWorker = this.workers.find(
      worker => !this.busyWorkers.has(worker)
    );
    if (idleWorker) return idleWorker;

    // Create new worker if below max
    if (this.workers.length < this.maxWorkers) {
      const newWorker = this.createWorker();
      this.workers.push(newWorker);
      return newWorker;
    }

    return null;
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    const worker = this.getIdleWorker();
    if (!worker) return;

    const task = this.taskQueue[0];
    this.busyWorkers.add(worker);

    worker.postMessage({
      taskId: task.id,
      type: task.type,
      buffer: task.buffer
    }, [task.buffer]);
  }

  async decode(
    type: 'jpeg' | 'jpeg-ls' | 'jpeg2000' | 'raw',
    buffer: ArrayBuffer
  ): Promise<Uint8ClampedArray> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `task-${Date.now()}-${Math.random()}`,
        type,
        buffer,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
  }
}