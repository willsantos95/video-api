#!/usr/bin/env python3
"""
Logo detection using OpenCV template matching + feature matching
Detects logo position in a video frame with dynamic ROI calculation
Handles multiple frame validation and returns reliable coordinates
"""

import cv2
import json
import sys
from pathlib import Path
import numpy as np


def calculate_dynamic_roi(frame_shape, template_shape):
    """
    Calculate dynamic ROI based on frame and template dimensions
    Assumes logo is typically in the lower left/center portion of frame
    """
    frame_h, frame_w = frame_shape[:2]
    template_h, template_w = template_shape[:2]

    roi_y = int(frame_h * 0.3)
    roi_x = int(frame_w * 0.02)
    roi_height = int(frame_h * 0.65)
    roi_width = int(frame_w * 0.6)

    return {
        'x': roi_x,
        'y': roi_y,
        'width': roi_width,
        'height': roi_height
    }


def detect_logo_template_matching(frame, template, roi_params, min_confidence=0.70):
    """Template matching with dynamic ROI - more reliable detection"""
    roi_x = roi_params['x']
    roi_y = roi_params['y']
    roi_width = roi_params['width']
    roi_height = roi_params['height']

    roi = frame[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]

    frame_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
    template_height, template_width = template_gray.shape

    best_match = None
    best_confidence = 0
    best_scale = 1.0

    for scale in [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5]:
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
        "x": int(x + roi_x),
        "y": int(y + roi_y),
        "width": int(w),
        "height": int(h),
        "confidence": float(best_confidence),
        "scale": float(best_scale),
        "method": "template_matching"
    }


def detect_logo_feature_matching(frame, template, roi_params):
    """Feature matching using ORB with ROI - more robust to variations"""
    try:
        roi_x = roi_params['x']
        roi_y = roi_params['y']
        roi_width = roi_params['width']
        roi_height = roi_params['height']

        roi = frame[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]

        frame_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
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
            "x": x + roi_x,
            "y": y + roi_y,
            "width": width,
            "height": height,
            "confidence": float(confidence),
            "method": "feature_matching"
        }
    except Exception as e:
        return None


def validate_detection_coordinates(frame, detection):
    """Validate that detection coordinates are within frame bounds and reasonable"""
    frame_h, frame_w = frame.shape[:2]
    x, y, w, h = detection["x"], detection["y"], detection["width"], detection["height"]

    if x < 0 or y < 0 or w < 20 or h < 20:
        return False, "Coordinates out of bounds"

    if x + w > frame_w or y + h > frame_h:
        return False, "Detection exceeds frame boundaries"

    if w > frame_w * 0.8 or h > frame_h * 0.8:
        return False, "Logo too large"

    return True, "Valid"


def validate_color_match(frame, template, detection):
    """Validate detection by checking color histogram similarity"""
    x, y, w, h = detection["x"], detection["y"], detection["width"], detection["height"]

    if y + h > frame.shape[0] or x + w > frame.shape[1]:
        return False

    try:
        frame_roi = frame[int(y):int(y+h), int(x):int(x+w)]
        if frame_roi.size == 0:
            return False

        template_hsv = cv2.cvtColor(template, cv2.COLOR_BGR2HSV)
        frame_roi_hsv = cv2.cvtColor(frame_roi, cv2.COLOR_BGR2HSV)

        frame_hist = cv2.calcHist([frame_roi_hsv], [0, 1], None, [180, 256], [0, 180, 0, 256])
        template_hist = cv2.calcHist([template_hsv], [0, 1], None, [180, 256], [0, 180, 0, 256])

        cv2.normalize(frame_hist, frame_hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(template_hist, template_hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

        similarity = cv2.compareHist(frame_hist, template_hist, cv2.HISTCMP_BHATTACHARYYA)

        return similarity < 2.5
    except:
        return False


def detect_logo(frame_path, logo_path, output_path):
    """
    Detect logo with dynamic ROI and comprehensive validation
    Uses: template matching + feature matching with size/coordinate validation
    """
    try:
        frame = cv2.imread(frame_path)
        template = cv2.imread(logo_path)

        if frame is None or template is None:
            raise ValueError("Could not read frame or template image")

        template_h, template_w = template.shape[:2]
        frame_h, frame_w = frame.shape[:2]

        roi_params = calculate_dynamic_roi(frame.shape, template.shape)

        detection = None
        confidence = 0

        detection = detect_logo_template_matching(frame, template, roi_params, min_confidence=0.70)

        if detection is None:
            detection = detect_logo_feature_matching(frame, template, roi_params)

        if detection is None:
            results = {
                "success": False,
                "confidence": 0,
                "message": "Logo not detected in frame",
                "frame_resolution": f"{frame_w}x{frame_h}"
            }
        else:
            is_valid, msg = validate_detection_coordinates(frame, detection)
            if not is_valid:
                results = {
                    "success": False,
                    "confidence": detection["confidence"],
                    "message": f"Detection failed validation: {msg}"
                }
            else:
                detected_w = detection["width"]
                detected_h = detection["height"]

                size_ratio_w = detected_w / template_w
                size_ratio_h = detected_h / template_h

                is_valid_size = (0.2 <= size_ratio_w <= 2.0) and (0.2 <= size_ratio_h <= 2.0)

                if not is_valid_size:
                    results = {
                        "success": False,
                        "confidence": detection["confidence"],
                        "message": "Logo match failed size validation",
                        "size_ratios": {
                            "width": float(size_ratio_w),
                            "height": float(size_ratio_h)
                        }
                    }
                else:
                    results = {
                        "success": True,
                        "x": int(detection["x"]),
                        "y": int(detection["y"]),
                        "width": int(detection["width"]),
                        "height": int(detection["height"]),
                        "confidence": float(detection["confidence"]),
                        "scale": float(detection.get("scale", 1.0)),
                        "method": detection.get("method", "template_matching"),
                        "frame_resolution": f"{frame_w}x{frame_h}"
                    }

        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)

        print(json.dumps(results))
        return results

    except Exception as e:
        results = {
            "success": False,
            "error": str(e)
        }
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
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
