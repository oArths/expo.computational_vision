import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export async function abrirCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false
  })

  video.srcObject = stream
  await video.play()

  return stream
}

export async function criarDetector() {
  const fileset = await FilesetResolver.forVisionTasks('/wasm')

  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/models/hand_landmarker.task' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  })
}

export function iniciarLoop({ video, detector, onResultado }) {
  let ultimoFrame = -1
  let ativo = true

  function loop() {
    if (!ativo) return
    requestAnimationFrame(loop)

    if (video.readyState < 2 || video.currentTime === ultimoFrame) return
    ultimoFrame = video.currentTime

    const agora = performance.now()
    onResultado(detector.detectForVideo(video, agora), agora)
  }

  requestAnimationFrame(loop)

  return () => {
    ativo = false
  }
}
