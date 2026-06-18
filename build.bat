@echo off
echo === Building Raster Engine Wasm Module ===
cd raster-engine

where wasm-pack >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo wasm-pack not found. Installing...
    cargo install wasm-pack
)

echo Building with wasm-pack...
wasm-pack build --target web --out-dir pkg --release

if %ERRORLEVEL% neq 0 (
    echo FAILED: wasm-pack build failed
    cd ..
    exit /b 1
)

echo === Wasm build complete ===
cd ..

echo === Installing TypeScript dependencies ===
cd ts-framework
call npm install
cd ..

echo === Compiling TypeScript ===
cd ts-framework
call npx tsc
cd ..

echo === Build complete ===
echo Run: cd demo ^&^& npx http-server -p 8080
