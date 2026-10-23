import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export async function abrirCamera(video) {
  // 640x480 basta para o preview e para o detector, e custa 4x menos que 720p.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false
  })

  video.srcObject = stream
  await video.play()

  return stream
}

export async function criarDetector() {
  const criar = async delegate => {
    const fileset = await FilesetResolver.forVisionTasks('/wasm')

    return HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    })
  }

  // GPU é mais rápido, mas falha em algumas máquinas; CPU é o plano B.
  try {
    return await criar('GPU')
  } catch (erro) {
    console.warn('MediaPipe sem GPU, usando CPU.', erro)
    return criar('CPU')
  }
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
