#!/usr/bin/env python3
"""
Logo detection using OpenCV template matching
Detects logo position in a video frame
"""

import cv2
import json
import sys
from pathlib import Path


def detect_logo(frame_path, logo_path, output_path):
    """
    Detect logo position in frame using template matching

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

        # Multi-scale template matching (handle different sizes)
        best_match = None
        best_confidence = 0
        best_scale = 1.0

        # Try different scales of the template (0.5x to 2x original size)
        for scale in [0.5, 0.7, 0.9, 1.0, 1.2, 1.5, 2.0]:
            scaled_template = cv2.resize(
                template_gray,
                (
                    int(template_width * scale),
                    int(template_height * scale)
                )
            )

            # Skip if scaled template is larger than frame
            if (
                scaled_template.shape[0] > frame_gray.shape[0]
                or scaled_template.shape[1] > frame_gray.shape[1]
            ):
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

            results = {
                "success": True,
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "confidence": float(best_confidence),
                "scale": float(best_scale)
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
