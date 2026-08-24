import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

LARGURA_CAM, ALTURA_CAM = 640, 480  # Resolução da captura
CONFIDENCE_DETECCAO = 0.7
CONFIDENCE_RASTREAMENTO = 0.5
THICKNESS_DESENHO = 2
RAIO_CIRCULO = 4

def dedo_levantado(hand, ponta, articulacao):
    return hand[ponta].y < hand[articulacao].y

base_options = python.BaseOptions(model_asset_path="models/hand_landmarker.task")

options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)

detector = vision.HandLandmarker.create_from_options(options)

camera = cv2.VideoCapture(0)

while True:
    success, frame = camera.read()

    if not success:
        break

    # OpenCV: BGR → RGB
    frame = cv2.flip(frame,1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Transformar para o formato esperado pelo MediaPipe
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = detector.detect(image)

    if result.hand_landmarks:
        hand = result.hand_landmarks[0]
        h, w, _ = frame.shape

        for landmark in hand:
            x = int(landmark.x * w)
            y = int(landmark.y * h)

            cv2.circle(
                frame,
                (x, y),
                6,
                (0, 255, 0),
                -1
            )
        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (5, 6), (6, 7), (7, 8),
            (0, 9), (9, 10), (10, 11), (11, 12),
            (0, 13), (13, 14), (14, 15), (15, 16),
            (0, 17), (17, 18), (18, 19), (19, 20),
            (5, 9), (9, 13), (13, 17)
        ]

        for a, b in connections:
            p1 = hand[a]
            p2 = hand[b]

            x1, y1 = int(p1.x * w), int(p1.y * h)
            x2, y2 = int(p2.x * w), int(p2.y * h)

            cv2.line(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )
   

        indicador = dedo_levantado(hand, 8, 6)
        medio = dedo_levantado(hand, 12, 10)
        anelar = dedo_levantado(hand, 16, 14)
        minimo = dedo_levantado(hand, 20, 18)
        polegar = hand[4].x > hand[3].x
        if polegar and not indicador and not medio and not anelar and not minimo:
            print("👍 JOINHA!")
        if indicador and not polegar and not medio and not anelar and not minimo:
            print("👍 indicador!")

        cv2.circle(frame, (x, y), 10, (0, 255, 0), -1)

    cv2.imshow("Labirinto - Camera", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()
