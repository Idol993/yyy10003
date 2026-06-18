import { WasmExports, WasmRasterEngine } from './types';

let wasmInstance: WasmExports | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

export async function initWasm(wasmPath: string): Promise<WasmExports> {
  if (wasmInstance) return wasmInstance;

  const importObject = {};

  const result = await WebAssembly.instantiateStreaming(fetch(wasmPath), importObject);
  const exports = result.instance.exports as unknown as WasmExports;
  wasmInstance = exports;
  wasmMemory = exports.memory;
  return exports;
}

export function getWasm(): WasmExports {
  if (!wasmInstance) throw new Error('WASM not initialized. Call initWasm() first.');
  return wasmInstance;
}

export function getWasmMemory(): WebAssembly.Memory {
  if (!wasmMemory) throw new Error('WASM memory not available.');
  return wasmMemory;
}

export function createUint8View(engine: WasmRasterEngine): Uint8ClampedArray {
  const wasm = getWasm();
  const ptr = engine.get_buffer_ptr();
  const len = engine.get_buffer_len();
  return new Uint8ClampedArray(wasm.memory.buffer, ptr, len);
}

export function createImageData(engine: WasmRasterEngine): ImageData {
  const wasm = getWasm();
  const ptr = engine.get_buffer_ptr();
  const len = engine.get_buffer_len();
  const width = engine.get_width();
  const height = engine.get_height();
  const view = new Uint8ClampedArray(wasm.memory.buffer, ptr, len);
  return new ImageData(view, width, height);
}

export function writeBytesToWasm(data: Uint8Array): { ptr: number; len: number } {
  const wasm = getWasm();
  const ptr = wasm.__wbindgen_malloc(data.length);
  const memory = new Uint8Array(wasm.memory.buffer);
  memory.set(data, ptr);
  return { ptr, len: data.length };
}

export function freeWasmBytes(ptr: number, len: number): void {
  const wasm = getWasm();
  wasm.__wbindgen_free(ptr, len);
}

export function writeFloatArrayToWasm(data: Float32Array): { ptr: number; len: number } {
  const byteLen = data.byteLength;
  const wasm = getWasm();
  const ptr = wasm.__wbindgen_malloc(byteLen);
  const memory = new Uint8Array(wasm.memory.buffer);
  memory.set(new Uint8Array(data.buffer, data.byteOffset, data.length * 4), ptr);
  return { ptr, len: data.length };
}
