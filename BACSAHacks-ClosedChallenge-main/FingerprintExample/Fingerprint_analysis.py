import os
import cv2
import numpy as np

folder = "Suspect_Fingerprints"

# --- Image Enhancement Function ---
# This helps the algorithm "see" ridges through smudges or low-contrast scans
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

# Load Evidence (Distored Fingerprint)
suspect_file_raw = cv2.imread("CrimeScene_Fingerprint.bmp")
suspect_file = preprocess_fingerprint(suspect_file_raw)

# ORB: Oriented FAST and Rotated BRIEF
# Tool used for imaage matching and feature detection.
# ORB Setup: Increased features to 3000 to better capture details in smudged prints
orb = cv2.ORB_create(nfeatures=3000)

# Evidence features and their descriptors
e_kp, e_des = orb.detectAndCompute(suspect_file, None)

# --- PARTIAL PRINTS ---
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
        matches = []
    else:
        # Define the two versions to test
        versions = [
            img, 
            cv2.flip(img, 1), # Horizontal
            cv2.flip(img, 0), # Vertical
            cv2.flip(img, -1) # Both
        ]
        
        max_flip_score = 0
        best_version_kp = None
        best_version_matches = None 

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
                best_version_kp = kp_v
                best_version_matches = good

        score = max_flip_score
        ##kp = best_version_kp # Update kp for the winning version
        ##matches_to_save = best_version_matches

    # --- Calculate Confidence Score (1-100) ---
    # We use 50 verified points as a benchmark for 100% confidence.
    # Anything above 50 is extremely high confidence; anything below 10 is low.
    confidence = min(100, int((score / 50) * 100))
    
    # Store data for ranking
    all_results.append({
        'name': name,
        'score': score,
        'confidence': confidence,
        'path': path,
        'img': img_raw,
        'kp': best_version_kp,
        'matches': best_version_matches
    })
    print(f"Processed {name}: Score {score}, Confidence {confidence}%")

# --- Ranking Logic ---
# Sort suspects from highest score to lowest
all_results.sort(key=lambda x: x['score'], reverse=True)
if all_results and all_results[0]['score'] > 0:
    print("\n" + "="*30)
    print("SUSPECT RANKING (Most Likely first):")
    for i, res in enumerate(all_results[:5], 1): # Show top 5
        print(f"{i}. {res['name']} - Confidence: {res['confidence']}% (Score: {res['score']})")
    print("="*30)

    # Visualization for the #1 ranked suspect
    top_suspect = all_results[0]

    # SAFETY CHECK: Ensure we have data to draw
    if top_suspect['kp'] is not None and top_suspect['matches'] is not None:
        
        # Create the matching visualization
        vis = cv2.drawMatches(
            suspect_file, e_kp,
            preprocess_fingerprint(top_suspect['img']), top_suspect['kp'],
            top_suspect['matches'][:50], # Show top 50 verified points
            None,
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
        )

        # --- ENLARGE THE IMAGE ---
        # Calculate new dimensions (200% of original size)
        scale_percent = 200 
        width = int(vis.shape[1] * scale_percent / 100)
        height = int(vis.shape[0] * scale_percent / 100)
        dim = (width, height)
        
        # Resize using INTER_CUBIC for higher quality enlargement
        enlarged_vis = cv2.resize(vis, dim, interpolation=cv2.INTER_CUBIC)

        # Display the enlarged version
        window_name = f"Rank 1: {top_suspect['name']} ({top_suspect['confidence']}%)"
        cv2.imshow(window_name, enlarged_vis)
        
        print(f"\nDisplaying results at {scale_percent}% scale.")
        print("Click the image window and press any key to exit.")
        
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    else:
        print(f"Skipping visualization: No valid features found for {top_suspect['name']}.")
