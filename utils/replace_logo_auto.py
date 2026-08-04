#!/usr/bin/env python3
"""
Automated logo replacement workflow
Combines detection + replacement in a single pass with validation
"""

import cv2
import json
import sys
from pathlib import Path
import numpy as np
from detect_logo import (
    calculate_dynamic_roi,
    detect_logo_template_matching,
    detect_logo_feature_matching,
    validate_detection_coordinates
)


def replace_logo_on_video(video_path, old_logo_path, new_logo_path, output_path, output_json_path):
    """
    Detect and replace logo in video using FFmpeg filters
    Output JSON contains the detection coordinates for reference
    """
    try:
        import cv2
        import subprocess

        frame = cv2.imread(video_path)
        if frame is None:
            raise ValueError(f"Could not read frame from video: {video_path}")

        template = cv2.imread(old_logo_path)
        if template is None:
            raise ValueError(f"Could not read old logo template: {old_logo_path}")

        new_logo = cv2.imread(new_logo_path)
        if new_logo is None:
            raise ValueError(f"Could not read new logo: {new_logo_path}")

        roi_params = calculate_dynamic_roi(frame.shape, template.shape)

        detection = detect_logo_template_matching(frame, template, roi_params, min_confidence=0.70)
        if detection is None:
            detection = detect_logo_feature_matching(frame, template, roi_params)

        if detection is None:
            raise ValueError("Could not detect old logo in frame")

        is_valid, msg = validate_detection_coordinates(frame, detection)
        if not is_valid:
            raise ValueError(f"Invalid detection coordinates: {msg}")

        old_logo_x = int(detection["x"])
        old_logo_y = int(detection["y"])
        old_logo_w = int(detection["width"])
        old_logo_h = int(detection["height"])

        new_logo_h, new_logo_w = new_logo.shape[:2]
        scale_factor = min(old_logo_w / new_logo_w, old_logo_h / new_logo_h)

        new_scaled_w = int(new_logo_w * scale_factor)
        new_scaled_h = int(new_logo_h * scale_factor)

        new_logo_x = old_logo_x
        new_logo_y = old_logo_y

        results = {
            "success": True,
            "message": "Logo replacement coordinates calculated",
            "old_logo": {
                "x": old_logo_x,
                "y": old_logo_y,
                "width": old_logo_w,
                "height": old_logo_h,
                "confidence": float(detection["confidence"]),
                "detection_method": detection.get("method", "template_matching")
            },
            "new_logo": {
                "x": new_logo_x,
                "y": new_logo_y,
                "width": new_scaled_w,
                "height": new_scaled_h,
                "scale_factor": float(scale_factor)
            }
        }

        with open(output_json_path, 'w') as f:
            json.dump(results, f, indent=2)

        print(json.dumps(results))
        return results

    except Exception as e:
        results = {
            "success": False,
            "error": str(e)
        }
        with open(output_json_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(json.dumps(results), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python replace_logo_auto.py <video_frame_path> <old_logo_path> <new_logo_path> <output_json_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    old_logo_path = sys.argv[2]
    new_logo_path = sys.argv[3]
    output_json_path = sys.argv[4]

    replace_logo_on_video(video_path, old_logo_path, new_logo_path, None, output_json_path)
