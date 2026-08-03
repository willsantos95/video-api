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

        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        template_height, template_width = template_gray.shape

        best_match = None
        best_confidence = -1
        best_scale = 1.0
        best_width = 0
        best_height = 0

        # Busca em múltiplas escalas
        scales = np.arange(0.40, 1.21, 0.01)

        for scale in scales:

            width = int(template_width * scale)
            height = int(template_height * scale)

            if width < 40 or height < 25:
                continue

            if (
                width > frame_gray.shape[1]
                or height > frame_gray.shape[0]
            ):
                continue

            interpolation = (
                cv2.INTER_AREA
                if scale < 1
                else cv2.INTER_CUBIC
            )

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

        # Nenhum candidato
        if best_match is None:

            results = {
                "success": False,
                "confidence": 0,
                "message": "Logo not detected in frame"
            }

        else:

            x, y = best_match

            gray_confidence = best_confidence

            # Template colorido na escala encontrada
            interpolation = (
                cv2.INTER_AREA
                if best_scale < 1
                else cv2.INTER_CUBIC
            )

            scaled_template_color = cv2.resize(
                template,
                (best_width, best_height),
                interpolation=interpolation
            )

            # Região candidata
            roi_color = frame[
                y:y + best_height,
                x:x + best_width
            ]

            # ----------------------------------------
            # Validação por cor
            # ----------------------------------------

            color_result = cv2.matchTemplate(
                roi_color,
                scaled_template_color,
                cv2.TM_CCOEFF_NORMED
            )

            _, color_confidence, _, _ = cv2.minMaxLoc(
                color_result
            )

            # ----------------------------------------
            # Validação por bordas
            # ----------------------------------------

            roi_gray = cv2.cvtColor(
                roi_color,
                cv2.COLOR_BGR2GRAY
            )

            template_validation_gray = cv2.cvtColor(
                scaled_template_color,
                cv2.COLOR_BGR2GRAY
            )

            roi_edges = cv2.Canny(
                roi_gray,
                50,
                150
            )

            template_edges = cv2.Canny(
                template_validation_gray,
                50,
                150
            )

            edge_result = cv2.matchTemplate(
                roi_edges,
                template_edges,
                cv2.TM_CCOEFF_NORMED
            )

            _, edge_confidence, _, _ = cv2.minMaxLoc(
                edge_result
            )

            # ----------------------------------------
            # Confiança combinada
            # ----------------------------------------

            final_confidence = (
                gray_confidence * 0.50
                + color_confidence * 0.35
                + edge_confidence * 0.15
            )

            # ----------------------------------------
            # Regras de validação
            # ----------------------------------------

            logo_detected = (
                gray_confidence >= 0.70
                and color_confidence >= 0.60
                and edge_confidence >= 0.30
            )

            if logo_detected:

                # Mesmo retorno antigo
                results = {
                    "success": True,
                    "x": int(x),
                    "y": int(y),
                    "width": int(best_width),
                    "height": int(best_height),
                    "confidence": float(final_confidence),
                    "scale": float(best_scale)
                }

            else:

                # Mesmo retorno antigo
                results = {
                    "success": False,
                    "confidence": 0,
                    "message": "Logo not detected in frame"
                }

        # Salva JSON
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

        print(
            json.dumps(results),
            file=sys.stderr
        )

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
