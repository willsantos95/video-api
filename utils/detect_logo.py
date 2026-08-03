#!/usr/bin/env python3

import cv2
import json
import sys
import numpy as np


def detect_logo(frame_path, logo_path, output_path):

    try:
        frame = cv2.imread(frame_path)
        template = cv2.imread(logo_path)

        if frame is None or template is None:
            raise ValueError("Could not read frame or template image")

        # Converte para grayscale
        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        template_height, template_width = template_gray.shape

        best_match = None
        best_confidence = -1
        best_scale = 1.0
        best_width = 0
        best_height = 0

        # Busca muito mais granular
        # 0.30 até 1.50 em passos de 0.01
        scales = np.arange(0.30, 1.51, 0.01)

        for scale in scales:

            width = int(template_width * scale)
            height = int(template_height * scale)

            # Evita dimensões inválidas
            if width < 10 or height < 10:
                continue

            # Evita template maior que o frame
            if width > frame_gray.shape[1] or height > frame_gray.shape[0]:
                continue

            # INTER_AREA é melhor quando estamos diminuindo
            if scale < 1:
                interpolation = cv2.INTER_AREA
            else:
                interpolation = cv2.INTER_CUBIC

            scaled_template = cv2.resize(
                template_gray,
                (width, height),
                interpolation=interpolation
            )

            result = cv2.matchTemplate(
                frame_gray,
                scaled_template,
                cv2.TM_CCOEFF_NORMED
            )

            _, max_val, _, max_loc = cv2.minMaxLoc(result)

            if max_val > best_confidence:

                best_confidence = max_val
                best_match = max_loc
                best_scale = scale
                best_width = width
                best_height = height

        # Threshold
        threshold = 0.50

        if best_match is None or best_confidence < threshold:

            results = {
                "success": False,
                "confidence": float(max(best_confidence, 0)),
                "scale": float(best_scale),
                "message": "Logo not detected in frame"
            }

        else:

            x, y = best_match

            results = {
                "success": True,
                "x": int(x),
                "y": int(y),
                "width": int(best_width),
                "height": int(best_height),
                "confidence": float(best_confidence),
                "scale": float(best_scale)
            }

        with open(output_path, "w") as f:
            json.dump(results, f)

        print(json.dumps(results))

        return results

    except Exception as e:

        results = {
            "success": False,
            "error": str(e)
        }

        with open(output_path, "w") as f:
            json.dump(results, f)

        print(json.dumps(results), file=sys.stderr)

        sys.exit(1)


if __name__ == "__main__":

    if len(sys.argv) < 4:
        print(
            "Usage: python detect_logo.py "
            "<frame_path> <logo_path> <output_path>"
        )
        sys.exit(1)

    frame_path = sys.argv[1]
    logo_path = sys.argv[2]
    output_path = sys.argv[3]

    detect_logo(
        frame_path,
        logo_path,
        output_path
    )
