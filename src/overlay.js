import { HandLandmarker } from '@mediapipe/tasks-vision'

const CONEXOES = HandLandmarker.HAND_CONNECTIONS
const PONTA_INDICADOR = 8

// O canvas é espelhado por CSS junto com o vídeo, então desenhamos nas
// coordenadas originais da câmera.
export function redimensionarOverlay(canvas, video) {
  if (canvas.width === video.videoWidth && canvas.height === video.videoHeight) return
  if (!video.videoWidth) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
}

export function desenharOverlay(canvas, { hands, primaria, juntas }) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas

  ctx.clearRect(0, 0, width, height)
  if (hands.length === 0) return

  hands.forEach((hand, indice) => {
    const principal = indice === primaria
    const ponto = (landmark) => ({ x: landmark.x * width, y: landmark.y * height })

    ctx.strokeStyle = principal ? '#68d391' : 'rgba(104, 211, 145, 0.35)'
    ctx.lineWidth = principal ? 4 : 2

    for (const { start, end } of CONEXOES) {
      const a = ponto(hand[start])
      const b = ponto(hand[end])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    for (const landmark of hand) {
      const { x, y } = ponto(landmark)
      ctx.beginPath()
      ctx.arc(x, y, principal ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = principal ? '#68d391' : 'rgba(104, 211, 145, 0.4)'
      ctx.fill()
    }

    if (!principal) return

    const dedo = ponto(hand[PONTA_INDICADOR])
    ctx.beginPath()
    ctx.arc(dedo.x, dedo.y, juntas ? 14 : 9, 0, Math.PI * 2)
    ctx.fillStyle = juntas ? '#4facfe' : '#e53e3e'
    ctx.fill()
  })
}
