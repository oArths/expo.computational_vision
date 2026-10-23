import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// 640x480 já é mais que o preview (320px) e que o modelo precisa.
export async function abrirCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false
  })

  video.srcObject = stream
  await video.play()

  return stream
}

// A GPU do navegador pode ser emulada por software; aí não adianta nada.
function gpuPorSoftware() {
  const gl = document.createElement('canvas').getContext('webgl2')
  if (!gl) return true

  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const nome = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''
  gl.getExtension('WEBGL_lose_context')?.loseContext()

  return /swiftshader|software|llvmpipe/i.test(nome)
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
    const delegado = gpuPorSoftware() ? 'GPU (software)' : 'GPU'
    return { detector: await criar('GPU'), delegado }
  } catch (erro) {
    console.warn('MediaPipe sem GPU, usando CPU.', erro)
    return { detector: await criar('CPU'), delegado: 'CPU' }
  }
}

export function iniciarLoop({ video, detector, onResultado }) {
  // O modelo redimensiona para ~200px de qualquer jeito; mandar 320px evita
  // subir o frame inteiro da câmera para a GPU a cada quadro.
  const entrada = document.createElement('canvas')
  const ctx = entrada.getContext('2d', { willReadFrequently: false })
  const LARGURA_MAXIMA = 320

  let ultimoFrame = -1
  let ativo = true

  function loop() {
    if (!ativo) return
    requestAnimationFrame(loop)

    if (video.readyState < 2 || video.currentTime === ultimoFrame) return
    ultimoFrame = video.currentTime

    if (!video.videoWidth) return

    const largura = Math.min(LARGURA_MAXIMA, video.videoWidth)
    const altura = Math.round((largura * video.videoHeight) / video.videoWidth)

    if (entrada.width !== largura || entrada.height !== altura) {
      entrada.width = largura
      entrada.height = altura
    }

    ctx.drawImage(video, 0, 0, largura, altura)

    const agora = performance.now()
    onResultado(detector.detectForVideo(entrada, agora), agora)
  }

  requestAnimationFrame(loop)

  return () => {
    ativo = false
  }
}
