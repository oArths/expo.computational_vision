import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

LARGURA_CAM, ALTURA_CAM = 1920, 1080  # Resolução da captura
CONFIDENCE_DETECCAO = 0.7
CONFIDENCE_RASTREAMENTO = 0.5
THICKNESS_DESENHO = 2
RAIO_CIRCULO = 4
MARGEM = 20
QUADRADO_TAMANHO = 100
CONNECTIONS = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 4),
    (0, 5),
    (5, 6),
    (6, 7),
    (7, 8),
    (0, 9),
    (9, 10),
    (10, 11),
    (11, 12),
    (0, 13),
    (13, 14),
    (14, 15),
    (15, 16),
    (0, 17),
    (17, 18),
    (18, 19),
    (19, 20),
    (5, 9),
    (9, 13),
    (13, 17),
]


def apto(hand, indicador, x1, x2, y1, y2, w, h):

    posicao_indicador_vertical = int(hand[indicador].y * h)
    posicao_indicador_horizontal = int(hand[indicador].x * w)

    # print(x1)
    # print(x2)
    # print(y1)
    # print(y2)
    # 270
    # 370
    # 190
    # 290
    # print(posicao_indicador_horizontal)
    # esquerda - direta +
    # print(posicao_indicador_vertical)
    # subir - descer +
    # return
    return bool(
        posicao_indicador_horizontal > x1 + MARGEM
        and posicao_indicador_horizontal < x2 - MARGEM
        and posicao_indicador_vertical > y1 + MARGEM
        and posicao_indicador_vertical < y2 - MARGEM
    )


def moviemento(hand, indicador, x1, x2, y1, y2, w, h):

    posicao_indicador_vertical = int(hand[indicador].y * h)
    posicao_indicador_horizontal = int(hand[indicador].x * w)

    # print(x1)
    # print(x2)
    # print(y1)
    # print(y2)
    # 270
    # 370
    # 190
    # 290
    # print(posicao_indicador_horizontal)
    # esquerda - direta +
    # print(posicao_indicador_vertical)
    # subir - descer +
    # return

    if (
        posicao_indicador_horizontal < x1 + MARGEM
        and posicao_indicador_vertical > y1 - MARGEM
        and posicao_indicador_vertical < y2 + MARGEM
    ):
        print("LEFT")
    elif (
        posicao_indicador_horizontal > x2 - MARGEM
        and posicao_indicador_vertical > y1 - MARGEM
        and posicao_indicador_vertical < y2 + MARGEM
    ):
        print("RIGTH")
    # elif posicao_indicador_vertical > y1:
    #     print("TOP")
    # elif posicao_indicador_vertical > y2:
    #     print("BOTTOM")


base_options = python.BaseOptions(model_asset_path="models/hand_landmarker.task")

options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)

detector = vision.HandLandmarker.create_from_options(options)

camera = cv2.VideoCapture(0)
estado_anterior = False
while True:
    success, frame = camera.read()

    if not success:
        break

    # OpenCV: BGR → RGB
    camera.set(16, LARGURA_CAM)
    camera.set(9, ALTURA_CAM)

    frame = cv2.flip(frame, 1)
    # Criando Obj Central de Ref
    h, w, _ = frame.shape
    x1 = (w - QUADRADO_TAMANHO) // 2
    y1 = (h - QUADRADO_TAMANHO) // 2
    x2 = x1 + QUADRADO_TAMANHO
    y2 = y1 + QUADRADO_TAMANHO

    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    # print(x1, x2,y1, y2)
    # 270 370 190 290
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Transformar para o formato esperado pelo MediaPipe
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = detector.detect(image)

    if result.hand_landmarks:
        hand = result.hand_landmarks[0]
        h, w, _ = frame.shape

        estado_atual = apto(hand, 8, x1, x2, y1, y2, w, h)
        if estado_atual == True and estado_anterior == False:
            print("entrou")
        if estado_atual == False and estado_anterior == True:
            print("saiu")
            moviemento(hand, 8, x1, x2, y1, y2, w, h)

        estado_anterior = estado_atual
        for landmark in hand:
            x = int(landmark.x * w)
            y = int(landmark.y * h)

            cv2.circle(frame, (x, y), 6, (0, 255, 0), -1)

        # for a, b in CONNECTIONS:
        #     p1 = hand[a]
        #     p2 = hand[b]

        #     x1, y1 = int(p1.x * w), int(p1.y * h)
        #     x2, y2 = int(p2.x * w), int(p2.y * h)

        #     cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # cv2.circle(frame, (x, y), 10, (0, 255, 0), -1)

    cv2.imshow("Labirinto - Camera", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()
