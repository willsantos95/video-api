#!/usr/bin/env python3
"""
Logo detection using OpenCV template matching + feature matching
Detects logo position in a video frame with false positive filtering
"""

import cv2
import json
import sys
from pathlib import Path
import numpy as np


def detect_logo_template_matching(frame, template, min_confidence=0.80):
    """Template matching method with higher threshold"""
    frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
    template_height, template_width = template_gray.shape

    best_match = None
    best_confidence = 0
    best_scale = 1.0

    for scale in [0.5, 0.7, 0.9, 1.0, 1.2, 1.5, 2.0]:
        scaled_template = cv2.resize(
            template_gray,
            (int(template_width * scale), int(template_height * scale))
        )

        if (scaled_template.shape[0] > frame_gray.shape[0] or
            scaled_template.shape[1] > frame_gray.shape[1]):
            continue

        result = cv2.matchTemplate(
            frame_gray, scaled_template, cv2.TM_CCOEFF_NORMED
        )
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

        if max_val > best_confidence:
            best_confidence = max_val
            best_match = max_loc
            best_scale = scale

    if best_match is None or best_confidence < min_confidence:
        return None

    x, y = best_match
    w = int(template_width * best_scale)
    h = int(template_height * best_scale)

    return {
        "x": int(x),
        "y": int(y),
        "width": int(w),
        "height": int(h),
        "confidence": float(best_confidence),
        "scale": float(best_scale),
        "method": "template_matching"
    }


def detect_logo_feature_matching(frame, template):
    """Feature matching using ORB (more robust to variations)"""
    try:
        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        orb = cv2.ORB_create(nfeatures=500)
        kp1, des1 = orb.detectAndCompute(template_gray, None)
        kp2, des2 = orb.detectAndCompute(frame_gray, None)

        if des1 is None or des2 is None or len(kp1) < 5:
            return None

        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        if len(matches) < 10:
            return None

        good_matches = [m for m in matches if m.distance < 50]
        if len(good_matches) < 5:
            return None

        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        if H is None:
            return None

        h, w = template_gray.shape
        pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
        dst = cv2.perspectiveTransform(pts, H)

        x_coords = dst[:, 0, 0]
        y_coords = dst[:, 0, 1]

        if np.any(x_coords < 0) or np.any(y_coords < 0):
            return None

        x, y = int(np.min(x_coords)), int(np.min(y_coords))
        width, height = int(np.max(x_coords) - x), int(np.max(y_coords) - y)

        if width < 20 or height < 20:
            return None

        confidence = min(len(good_matches) / 50.0, 1.0)
        return {
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "confidence": float(confidence),
            "method": "feature_matching"
        }
    except:
        return None


def validate_color_match(frame, template, detection):
    """Validate detection by checking color histogram similarity"""
    x, y, w, h = detection["x"], detection["y"], detection["width"], detection["height"]

    if y + h > frame.shape[0] or x + w > frame.shape[1]:
        return False

    frame_roi = frame[y:y+h, x:x+w]
    template_hsv = cv2.cvtColor(template, cv2.COLOR_BGR2HSV)
    frame_roi_hsv = cv2.cvtColor(frame_roi, cv2.COLOR_BGR2HSV)

    frame_hist = cv2.calcHist([frame_roi_hsv], [0, 1], None, [180, 256], [0, 180, 0, 256])
    template_hist = cv2.calcHist([template_hsv], [0, 1], None, [180, 256], [0, 180, 0, 256])

    similarity = cv2.compareHist(frame_hist, template_hist, cv2.HISTCMP_BHATTACHARYYA)

    return similarity < 2.5


def detect_logo(frame_path, logo_path, output_path):
    """
    Detect logo with false positive filtering
    Uses: template matching (0.80 threshold) + feature matching + color validation
    """
    try:
        frame = cv2.imread(frame_path)
        template = cv2.imread(logo_path)

        if frame is None or template is None:
            raise ValueError("Could not read frame or template image")

        # Try template matching first (faster, but higher threshold to avoid false positives)
        detection = detect_logo_template_matching(frame, template, min_confidence=0.80)

        if detection is None:
            # Fallback to feature matching (more robust)
            detection = detect_logo_feature_matching(frame, template)

        if detection is None:
            results = {
                "success": False,
                "confidence": 0,
                "message": "Logo not detected in frame"
            }
        else:
            # Validate with color matching to filter false positives
            if not validate_color_match(frame, template, detection):
                results = {
                    "success": False,
                    "confidence": 0,
                    "message": "Logo match failed color validation (false positive filtered)"
                }
            else:
                results = {
                    "success": True,
                    "x": detection["x"],
                    "y": detection["y"],
                    "width": detection["width"],
                    "height": detection["height"],
                    "confidence": detection["confidence"],
                    "scale": detection.get("scale", 1.0),
                    "method": detection.get("method", "template_matching")
                }

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

    detect_logo(frame_path, logo_path, output_path)
