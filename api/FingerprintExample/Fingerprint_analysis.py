import os
import cv2
import numpy as np

def fingerprint_ranking():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    folder = os.path.join(BASE_DIR, "Suspect_Fingerprints")

    # --- Image Enhancement Function ---
    def preprocess_fingerprint(image):
        if image is None: return None
        # Convert to grayscale if not already
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This sharpens ridge details even in smudged/faint areas
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)

        # Slight denoising to remove "salt and pepper" noise from old scans
        enhanced = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)

        return enhanced

    # Load Evidence (Distorted Fingerprint)
    suspect_file_raw = cv2.imread(os.path.join(BASE_DIR, "CrimeScene_Fingerprint.BMP"))
    suspect_file = preprocess_fingerprint(suspect_file_raw)

    # ORB: Oriented FAST and Rotated BRIEF
    # Tool used for image matching and feature detection.
    # ORB Setup: Increased features to 3000 to better capture details in smudged prints
    orb = cv2.ORB_create(nfeatures=3000)

    # Evidence features and their descriptors
    e_kp, e_des = orb.detectAndCompute(suspect_file, None)

    # Brute-force matcher for ORB (binary descriptors)
    # crossCheck must be False to allow the KNN (k=2) match for the Ratio Test
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

    # --- List to store all results for ranking ---
    all_results = []

    # Loop through each fingerprint in the folder and compare with the evidence
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        img_raw = cv2.imread(path)
        if img_raw is None: continue

        # --- ENHANCEMENT STEP ---
        img = preprocess_fingerprint(img_raw)

        # Features for the current fingerprint being observed
        kp, des = orb.detectAndCompute(img, None)
        if des is None: # No features found in the current image, skip it
            score = 0
        else:
            # Define the two versions to test
            versions = [
                img, 
                cv2.flip(img, 1), # Horizontal
                cv2.flip(img, 0), # Vertical
                cv2.flip(img, -1) # Both
            ]

            max_flip_score = 0

            for v_img in versions:
                kp_v, des_v = orb.detectAndCompute(v_img, None)
                if des_v is None or len(des_v) < 2: continue

                # --- KNN MATCHING & LOWE'S RATIO TEST ---
                # This is the primary fix for partial prints. 
                # It identifies unique landmarks even if most of the print is missing.
                matches = bf.knnMatch(e_des, des_v, k=2)
                good = []
                for match_pair in matches:
                    if len(match_pair) == 2:
                        m, n = match_pair
                        # 0.75 is the standard ratio for robust matching
                        if m.distance < 0.75 * n.distance:
                            good.append(m)

                # --- GEOMETRIC VERIFICATION (RANSAC) ---
                # This ensures the matches "make sense" spatially, handling rotation.
                if len(good) > 10:  # We need at least 4 points for Homography, 10 is safer
                    # Extract locations of matched keypoints
                    src_pts = np.float32([e_kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                    dst_pts = np.float32([kp_v[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

                    # findHomography finds the rotation/translation matrix.
                    # RANSAC filters out points that don't fit the rotation "pattern".
                    matrix, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)

                    # The new score is the number of "Inliers" 
                    # (points that actually fit the rotation/smudge pattern)
                    current_score = np.sum(mask) if mask is not None else 0
                else:
                    current_score = len(good)

                # Keep the better of the two (original vs flipped)
                if current_score > max_flip_score:
                    max_flip_score = current_score

            score = max_flip_score

        # --- Calculate Confidence Score (1-100) ---
        # We use 20 verified points as a benchmark for 100% confidence (was 50).
        # This makes partial/realistic matches yield higher confidence.
        confidence = min(100, (score /  10.0) * 100)

        # Store data for ranking
        all_results.append([name, confidence, score])

    # --- Ranking Logic ---
    # Sort suspects from highest score to lowest
    all_results.sort(key=lambda x: x[2], reverse=True)
    print(all_results)
    return all_results