#!/usr/bin/env python3
"""
Face orientation analyzer using Haar cascades.

Reads base64-encoded image data from stdin (JSON payload) and prints a JSON
result to stdout describing the detected orientation (front / left / right)
along with basic landmark metadata and confidence metrics.
"""
import base64
import json
import sys
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


def _read_payload() -> Dict:
    raw = sys.stdin.read()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _decode_image(data: str) -> Optional[np.ndarray]:
    if not data:
        return None
    if "," in data:
        data = data.split(",", 1)[1]
    try:
        buffer = base64.b64decode(data, validate=True)
    except (base64.binascii.Error, ValueError):
        return None
    arr = np.frombuffer(buffer, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def _largest_rect(rects: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    if rects is None or len(rects) == 0:
        return None
    rect = max(rects, key=lambda r: r[2] * r[3])
    return tuple(int(v) for v in rect)


def _orientation_from_landmarks(
    face_box: Tuple[int, int, int, int],
    nose_box: Optional[Tuple[int, int, int, int]],
    eyes: List[Tuple[int, int, int, int]],
) -> Tuple[str, float, Dict]:
    x, y, w, h = face_box
    face_center_x = x + w / 2.0

    orientation = "unknown"
    confidence = 0.0
    metrics: Dict[str, float] = {}

    if nose_box:
        nx, ny, nw, nh = nose_box
        nose_center_x = nx + nw / 2.0
        offset_ratio = (nose_center_x - face_center_x) / w
        metrics["nose_offset_ratio"] = float(offset_ratio)

        if abs(offset_ratio) < 0.08:
            orientation = "front"
            confidence = max(0.2, 1.0 - min(1.0, abs(offset_ratio) / 0.15))
        elif offset_ratio < 0:
            orientation = "left"
            confidence = min(1.0, abs(offset_ratio) / 0.35)
        else:
            orientation = "right"
            confidence = min(1.0, abs(offset_ratio) / 0.35)

    if len(eyes) >= 2:
        eyes_sorted = sorted(eyes, key=lambda item: item[0])
        left_eye, right_eye = eyes_sorted[0], eyes_sorted[-1]
        left_area = left_eye[2] * left_eye[3]
        right_area = right_eye[2] * right_eye[3]
        area_ratio = abs(left_area - right_area) / max(left_area, right_area)
        metrics["eye_area_ratio"] = float(area_ratio)

        if area_ratio > 0.25:
            if left_area > right_area:
                orientation = "left"
            else:
                orientation = "right"
            confidence = max(confidence, min(1.0, area_ratio))
        elif orientation == "unknown":
            orientation = "front"
            confidence = max(confidence, 0.3)

    return orientation, confidence, metrics


def analyze(image: np.ndarray) -> Dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    base_path = cv2.data.haarcascades
    face_cascade = cv2.CascadeClassifier(base_path + "haarcascade_frontalface_default.xml")
    eye_cascade = cv2.CascadeClassifier(base_path + "haarcascade_eye.xml")
    nose_cascade = cv2.CascadeClassifier(base_path + "haarcascade_mcs_nose.xml")

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(120, 120),
    )

    face_box = _largest_rect(faces)
    if not face_box:
        return {
            "success": False,
            "message": "Yüz tespit edilemedi",
        }

    x, y, w, h = face_box
    roi_gray = gray[y : y + h, x : x + w]

    eyes = eye_cascade.detectMultiScale(
        roi_gray,
        scaleFactor=1.08,
        minNeighbors=6,
        minSize=(int(w * 0.15), int(h * 0.15)),
        maxSize=(int(w * 0.5), int(h * 0.5)),
    )
    normalized_eyes = [
        (int(ex + x), int(ey + y), int(ew), int(eh)) for (ex, ey, ew, eh) in eyes
    ]

    nose = nose_cascade.detectMultiScale(
        roi_gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(int(w * 0.15), int(h * 0.15)),
    )
    nose_box = _largest_rect(nose)
    if nose_box:
        nx, ny, nw, nh = nose_box
        nose_box = (nx + x, ny + y, nw, nh)

    orientation, confidence, metrics = _orientation_from_landmarks(
        face_box, nose_box, normalized_eyes
    )

    yaw_angle = 0.0
    if "nose_offset_ratio" in metrics:
        yaw_angle = max(-45.0, min(45.0, metrics["nose_offset_ratio"] * 120.0))
        metrics["estimated_face_yaw"] = yaw_angle

    return {
        "success": True,
        "orientation": orientation,
        "confidence": round(confidence, 3),
        "landmarks": {
            "face": {
                "x": int(x),
                "y": int(y),
                "w": int(w),
                "h": int(h),
            },
            "nose": (
                {"x": int(nose_box[0]), "y": int(nose_box[1]), "w": int(nose_box[2]), "h": int(nose_box[3])}
                if nose_box
                else None
            ),
            "eyes": [
                {"x": int(ex), "y": int(ey), "w": int(ew), "h": int(eh)}
                for (ex, ey, ew, eh) in normalized_eyes
            ],
        },
        "metrics": metrics,
        "faceYaw": round(yaw_angle, 2),
    }


def main() -> None:
    payload = _read_payload()
    image_data = payload.get("imageBase64") or ""
    image = _decode_image(image_data)

    if image is None:
        print(json.dumps({"success": False, "message": "Görsel çözümlenemedi"}))
        sys.exit(1)

    result = analyze(image)
    print(json.dumps(result, ensure_ascii=False))

    if not result.get("success"):
        sys.exit(2)


if __name__ == "__main__":
    main()

