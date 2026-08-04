#!/usr/bin/env python3
"""
Logo detection using OpenCV template matching
Detects logo position in a video frame
Versão confiável com filtro de falsos positivos melhorado
"""

import cv2
import json
import sys
from pathlib import Path
import numpy as np


def validate_detection_by_size(detected_w, detected_h, template_w, template_h):
    """
    Valida se o tamanho detectado é razoável comparado ao template
    Reduz falsos positivos mantendo detecções reais
    """
    size_ratio_w = detected_w / template_w
    size_ratio_h = detected_h / template_h

    # Permite variação de 30% a 200% do tamanho original
    # Reduz falsos positivos que são muito maiores ou menores
    is_valid_size = (0.3 <= size_ratio_w <= 2.0) and (0.3 <= size_ratio_h <= 2.0)

    return is_valid_size, size_ratio_w, size_ratio_h


def validate_detection_by_bounds(frame, x, y, w, h):
    """
    Valida se o bounding box está dentro dos limites do frame
    """
    frame_h, frame_w = frame.shape[:2]

    if x < 0 or y < 0 or w < 20 or h < 20:
        return False

    if x + w > frame_w or y + h > frame_h:
        return False

    # Rejeita se ocupa mais de 90% do frame (falso positivo comum)
    if w > frame_w * 0.9 or h > frame_h * 0.9:
        return False

    return True


def validate_by_local_maxima(result_map, max_loc, min_distance=50):
    """
    Verifica se o pico detectado é realmente um máximo local
    Reduz falsos positivos de matches genéricos
    """
    x, y = max_loc
    h, w = result_map.shape

    # Extrai área ao redor do pico
    x_start = max(0, x - min_distance)
    x_end = min(w, x + min_distance)
    y_start = max(0, y - min_distance)
    y_end = min(h, y + min_distance)

    local_region = result_map[y_start:y_end, x_start:x_end]
    max_in_region = np.max(local_region)

    # Se o pico é bem definido, é provável ser um match legítimo
    return max_in_region


def detect_logo(frame_path, logo_path, output_path):
    """
    Detect logo position in frame using template matching
    Com validações para reduzir falsos positivos

    Args:
        frame_path: Path to video frame (JPG)
        logo_path: Path to logo template image
        output_path: Path to save detection results (JSON)
    """
    try:
        # Read frame and logo
        frame = cv2.imread(frame_path)
        template = cv2.imread(logo_path)

        if frame is None or template is None:
            raise ValueError("Could not read frame or template image")

        # Convert to grayscale for better matching
        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        # Get template dimensions
        template_height, template_width = template_gray.shape
        frame_height, frame_width = frame_gray.shape

        # Multi-scale template matching (handle different sizes)
        best_match = None
        best_confidence = 0
        best_scale = 1.0
        best_result_map = None

        # Try different scales of the template (0.5x to 2x original size)
        for scale in [0.5, 0.7, 0.9, 1.0, 1.2, 1.5, 2.0]:
            scaled_template = cv2.resize(
                template_gray,
                (int(template_width * scale), int(template_height * scale))
            )

            # Skip if scaled template is larger than frame
            if (scaled_template.shape[0] > frame_gray.shape[0] or
                scaled_template.shape[1] > frame_gray.shape[1]):
                continue

            # Template matching (normalized cross correlation)
            result = cv2.matchTemplate(
                frame_gray,
                scaled_template,
                cv2.TM_CCOEFF_NORMED
            )

            # Find best match
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

            if max_val > best_confidence:
                best_confidence = max_val
                best_match = max_loc
                best_scale = scale
                best_result_map = result

        if best_match is None or best_confidence < 0.5:
            # If no good match found, return error
            results = {
                "success": False,
                "confidence": 0,
                "message": "Logo not detected in frame"
            }
        else:
            x, y = best_match
            w = int(template_width * best_scale)
            h = int(template_height * best_scale)

            # Validações para reduzir falsos positivos

            # 1. Validar bounds
            if not validate_detection_by_bounds(frame, x, y, w, h):
                results = {
                    "success": False,
                    "confidence": best_confidence,
                    "message": "Detection out of frame bounds (false positive filtered)"
                }
            else:
                # 2. Validar tamanho
                is_valid_size, ratio_w, ratio_h = validate_detection_by_size(
                    w, h, template_width, template_height
                )

                if not is_valid_size:
                    results = {
                        "success": False,
                        "confidence": best_confidence,
                        "message": "Logo size out of expected range (false positive filtered)",
                        "size_ratio": {"width": float(ratio_w), "height": float(ratio_h)}
                    }
                else:
                    # 3. Validar se é um máximo local bem definido
                    local_max_value = validate_by_local_maxima(best_result_map, best_match)

                    # Se o máximo local é fraco, pode ser falso positivo
                    if local_max_value < best_confidence * 0.8:
                        results = {
                            "success": False,
                            "confidence": best_confidence,
                            "message": "Weak local maxima detected (false positive filtered)"
                        }
                    else:
                        results = {
                            "success": True,
                            "x": int(x),
                            "y": int(y),
                            "width": int(w),
                            "height": int(h),
                            "confidence": float(best_confidence),
                            "scale": float(best_scale),
                            "local_maxima_strength": float(local_max_value)
                        }

        # Save results to JSON
        with open(output_path, 'w') as f:
            json.dump(results, f)

        print(json.dumps(results))
        return results

    except Exception as e:
        results = {
            "success": False,
            "error": str(e)
        }
        with open(output_path, 'w') as f:
            json.dump(results, f)
        print(json.dumps(results), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python detect_logo.py <frame_path> <logo_path> <output_path>")
        sys.exit(1)

    frame_path = sys.argv[1]
    logo_path = sys.argv[2]
    output_path = sys.argv[3]

    detect_logo(frame_path, logo_path, output_path)
