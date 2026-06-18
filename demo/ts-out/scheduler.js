const DEFAULT_CONFIG = {
    targetFrameTime: 14.0, maxFrameTime: 30.0, minResolutionScale: 0.25, resolutionStep: 0.1,
};
export class FrameScheduler {
    constructor(config) {
        this.running = false;
        this.animFrameId = 0;
        this.lastFrameTime = 0;
        this.currentScale = 1.0;
        this.frameCount = 0;
        this.fpsAccumulator = 0;
        this.currentFps = 0;
        this.onFrame = null;
        this.onStats = null;
        this.timeSliced = false;
        this.pendingWork = [];
        this.maxWorkPerFrame = 8;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    get isRunning() { return this.running; }
    get fps() { return this.currentFps; }
    get resolutionScale() { return this.currentScale; }
    setFrameCallback(cb) { this.onFrame = cb; }
    setStatsCallback(cb) { this.onStats = cb; }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.lastFrameTime = performance.now();
        this.tick(this.lastFrameTime);
    }
    stop() {
        this.running = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = 0;
        }
    }
    addTimeSlicedWork(work) {
        this.pendingWork.push(work);
        this.timeSliced = true;
    }
    tick = (timestamp) => {
        if (!this.running)
            return;
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
    processTimeSlicedWork(frameStart) {
        if (this.pendingWork.length === 0) {
            this.timeSliced = false;
            return;
        }
        const maxTime = this.config.targetFrameTime * 0.5;
        let processed = 0;
        while (this.pendingWork.length > 0 && processed < this.maxWorkPerFrame) {
            const elapsed = performance.now() - frameStart;
            if (elapsed >= maxTime)
                break;
            const work = this.pendingWork.shift();
            const done = work();
            if (!done) {
                this.pendingWork.unshift(work);
                break;
            }
            processed++;
        }
    }
    adjustResolution(frameTime) {
        if (frameTime > this.config.maxFrameTime) {
            this.currentScale = Math.max(this.config.minResolutionScale, this.currentScale - this.config.resolutionStep);
        }
        else if (frameTime < this.config.targetFrameTime * 0.6 && this.currentScale < 1.0) {
            this.currentScale = Math.min(1.0, this.currentScale + this.config.resolutionStep * 0.5);
        }
    }
}
//# sourceMappingURL=scheduler.js.map
