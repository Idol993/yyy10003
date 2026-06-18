let wasmModule = null;
let wasmMemory = null;
let rasterEngineCtor = null;
export async function initWasm(modulePath) {
    if (wasmModule)
        return wasmModule;
    const module = await import(modulePath);
    if (typeof module.default === 'function') {
        await module.default();
    }
    wasmModule = module;
    if (module.memory) {
        wasmMemory = module.memory;
    }
    else if (module.wasm_memory) {
        wasmMemory = module.wasm_memory;
    }
    if (module.RasterEngine) {
        rasterEngineCtor = module.RasterEngine;
    }
    return module;
}
export function getWasmModule() {
    if (!wasmModule)
        throw new Error('WASM not initialized. Call initWasm() first.');
    return wasmModule;
}
export function getWasmMemory() {
    if (!wasmMemory)
        throw new Error('WASM memory not available.');
    return wasmMemory;
}
export function createEngine(width, height) {
    if (!rasterEngineCtor) {
        if (wasmModule && wasmModule.RasterEngine) {
            rasterEngineCtor = wasmModule.RasterEngine;
        }
        else {
            throw new Error('RasterEngine not available. Call initWasm() first.');
        }
    }
    if (typeof rasterEngineCtor.new === 'function') {
        return rasterEngineCtor.new(width, height);
    }
    return new rasterEngineCtor(width, height);
}
export function createUint8View(engine) {
    const mem = getWasmMemory();
    const ptr = engine.get_buffer_ptr();
    const len = engine.get_buffer_len();
    return new Uint8ClampedArray(mem.buffer, ptr, len);
}
export function createImageData(engine) {
    const mem = getWasmMemory();
    const ptr = engine.get_buffer_ptr();
    const len = engine.get_buffer_len();
    const width = engine.get_width();
    const height = engine.get_height();
    const view = new Uint8ClampedArray(mem.buffer, ptr, len);
    return new ImageData(view, width, height);
}
export function writeBytesToWasm(engine, data) {
    const ptr = engine.malloc(data.length);
    const memory = new Uint8Array(getWasmMemory().buffer);
    memory.set(data, ptr);
    return { ptr, len: data.length };
}
export function freeWasmBytes(engine, ptr, len) {
    engine.free(ptr, len);
}
export function writeFloatArrayToWasm(engine, data) {
    const byteLen = data.byteLength;
    const ptr = engine.malloc(byteLen);
    const memory = new Uint8Array(getWasmMemory().buffer);
    memory.set(new Uint8Array(data.buffer, data.byteOffset, data.length * 4), ptr);
    return { ptr, len: data.length };
}
//# sourceMappingURL=wasm-bridge.js.map
