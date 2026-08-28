import threading
import time

import cv2
import mediapipe as mp
from flask import Flask, jsonify
from flask_cors import CORS
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


movimento_atual: str | None = None

LARGURA_CAM, ALTURA_CAM = 1920, 1080
CONFIDENCE_DETECCAO = 0.7
CONFIDENCE_RASTREAMENTO = 0.5
MARGEM = 20
QUADRADO_TAMANHO = 200
MAX_FRAMES_PERDIDOS = 5


app = Flask(__name__)
CORS(app)


def apto(hand, indicador, x1, x2, y1, y2, w, h):
    posicao_vertical = int(hand[indicador].y * h)
    posicao_horizontal = int(hand[indicador].x * w)

    return (
        posicao_horizontal > x1 + MARGEM
        and posicao_horizontal < x2 - MARGEM
        and posicao_vertical > y1 + MARGEM
        and posicao_vertical < y2 - MARGEM
    )


def movimento(hand, indicador, x1, x2, y1, y2, w, h):
    posicao_vertical = int(hand[indicador].y * h)
    posicao_horizontal = int(hand[indicador].x * w)

    if (
        posicao_horizontal < x1 + MARGEM
        and y1 - MARGEM < posicao_vertical < y2 + MARGEM
    ):
        return "LEFT"

    elif (
        posicao_horizontal > x2 - MARGEM
        and y1 - MARGEM < posicao_vertical < y2 + MARGEM
    ):
        return "RIGHT"

    elif (
        posicao_vertical < y1 + MARGEM
        and x1 - MARGEM < posicao_horizontal < x2 + MARGEM
    ):
        return "TOP"

    elif (
        posicao_vertical > y2 - MARGEM
        and x1 - MARGEM < posicao_horizontal < x2 + MARGEM
    ):
        return "BOTTOM"

    return None


def tracking():
    global movimento_atual

    base_options = python.BaseOptions(model_asset_path="models/hand_landmarker.task")

    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        running_mode=vision.RunningMode.VIDEO,
        min_hand_detection_confidence=CONFIDENCE_DETECCAO,
        min_tracking_confidence=CONFIDENCE_RASTREAMENTO,
    )

    detector = vision.HandLandmarker.create_from_options(options)

    camera = cv2.VideoCapture(0)

    camera.set(cv2.CAP_PROP_FRAME_WIDTH, LARGURA_CAM)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTURA_CAM)

    estado_anterior = False
    frames_perdidos = 0

    while True:
        success, frame = camera.read()

        if not success:
            break

        frame = cv2.flip(frame, 1)

        h, w, _ = frame.shape

        x1 = (w - QUADRADO_TAMANHO) // 2
        y1 = (h - QUADRADO_TAMANHO) // 2
        x2 = x1 + QUADRADO_TAMANHO
        y2 = y1 + QUADRADO_TAMANHO

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        timestamp_ms = int(time.monotonic() * 1000)

        result = detector.detect_for_video(image, timestamp_ms)

        if result.hand_landmarks:
            frames_perdidos = 0

            hand = result.hand_landmarks[0]

            estado_atual = apto(hand, 8, x1, x2, y1, y2, w, h)

            # Entrou no quadrado
            if estado_atual and not estado_anterior:
                print("ENTROU")

            # Saiu do quadrado
            if not estado_atual and estado_anterior:
                movimento_detectado = movimento(hand, 8, x1, x2, y1, y2, w, h)

                if movimento_detectado:
                    movimento_atual = movimento_detectado
                    print(movimento_detectado)

            estado_anterior = estado_atual

            # Desenha landmarks
            for landmark in hand:
                x = int(landmark.x * w)
                y = int(landmark.y * h)

                cv2.circle(frame, (x, y), 6, (0, 255, 0), -1)

        else:
            frames_perdidos += 1

            if frames_perdidos >= MAX_FRAMES_PERDIDOS:
                estado_anterior = False

        cv2.imshow("Labirinto - Camera", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    camera.release()
    cv2.destroyAllWindows()


@app.get("/movimento")
def obter_movimento():
    global movimento_atual

    movimento = movimento_atual

    # Consome o comando depois que o frontend recebe
    movimento_atual = None

    return jsonify({"movimento": movimento})


thread = threading.Thread(target=tracking, daemon=True)

thread.start()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
