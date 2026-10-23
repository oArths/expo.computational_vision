import { cp, mkdir } from 'node:fs/promises'

// Copia o wasm do MediaPipe para public/ para o app funcionar offline no evento.
await mkdir('public/wasm', { recursive: true })
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', { recursive: true })
