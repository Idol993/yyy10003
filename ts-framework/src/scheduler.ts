import { FrameStats } from './types';

export interface SchedulerConfig {
  targetFrameTime: number;
  maxFrameTime: number;
  minResolutionScale: number;
  resolutionStep: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  targetFrameTime: 14.0,
  maxFrameTime: 30.0,
  minResolutionScale: 0.25,
  resolutionStep: 0.1,
};

export class FrameScheduler {
  private config: SchedulerConfig;
  private running: boolean = false;
  private animFrameId: number = 0;
  private lastFrameTime: number = 0;
  private currentScale: number = 1.0;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 0;
  private onFrame: ((dt: number, scale: number) => FrameStats | null) | null = null;
  private onStats: ((stats: FrameStats) => void) | null = null;
  private timeSliced: boolean = false;
  private pendingWork: Array<() => boolean> = [];
  private maxWorkPerFrame: number = 8;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this.running;
  }

  get fps(): number {
    return this.currentFps;
  }

  get resolutionScale(): number {
    return this.currentScale;
  }

  setFrameCallback(cb: (dt: number, scale: number) => FrameStats | null): void {
    this.onFrame = cb;
  }

  setStatsCallback(cb: (stats: FrameStats) => void): void {
    this.onStats = cb;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.tick(this.lastFrameTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  addTimeSlicedWork(work: () => boolean): void {
    this.pendingWork.push(work);
    this.timeSliced = true;
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const dt = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    const frameStart = performance.now();

    if (this.onFrame) {
      const stats = this.onFrame(dt, this.currentScale);
      if (stats && this.onStats) {
        this.onStats(stats);
      }
    }

    this.processTimeSlicedWork(frameStart);

    const frameEnd = performance.now();
    const frameTime = frameEnd - frameStart;

    this.adjustResolution(frameTime);

    this.frameCount++;
    this.fpsAccumulator += dt;
    if (this.fpsAccumulator >= 1000) {
      this.currentFps = (this.frameCount / this.fpsAccumulator) * 1000;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private processTimeSlicedWork(frameStart: number): void {
    if (this.pendingWork.length === 0) {
      this.timeSliced = false;
      return;
    }

    const maxTime = this.config.targetFrameTime * 0.5;
    let processed = 0;

    while (this.pendingWork.length > 0 && processed < this.maxWorkPerFrame) {
      const elapsed = performance.now() - frameStart;
      if (elapsed >= maxTime) break;

      const work = this.pendingWork.shift()!;
      const done = work();
      if (!done) {
        this.pendingWork.unshift(work);
        break;
      }
      processed++;
    }
  }

  private adjustResolution(frameTime: number): void {
    if (frameTime > this.config.maxFrameTime) {
      this.currentScale = Math.max(
        this.config.minResolutionScale,
        this.currentScale - this.config.resolutionStep
      );
    } else if (frameTime < this.config.targetFrameTime * 0.6 && this.currentScale < 1.0) {
      this.currentScale = Math.min(1.0, this.currentScale + this.config.resolutionStep * 0.5);
    }
  }
}
