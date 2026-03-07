import os
import cv2

folder = "Suspect_Fingerprints"

# Load Evidence (Distored Fingerprint)
suspect_file = cv2.imread("CrimeScene_Fingerprint.bmp")



# ORB: Oriented FAST and Rotated BRIEF
# Tool used for imaage matching and feature detection.
orb = cv2.ORB_create(nfeatures=1000)

# Evidence features and their descriptors
e_kp, e_des = orb.detectAndCompute(suspect_file, None)


# Brute-force matcher for ORB (binary descriptors)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

# Variables to track the best match
best_path = None 
best_score = -1 
best_img = None 
best_kp = None 
best_matches = None 

# Loop through each fingerprint in the folder and compare with the evidence
for name in os.listdir(folder):
    path = os.path.join(folder, name)
    img = cv2.imread(path)

    #Features for the current fingerprint being observed
    kp, des = orb.detectAndCompute(img, None)
    if des is None: # No features found in the current image, skip it
        score = 0
        matches = []
    else:
        #Compare each descriptor of the evidence with the current fingerprint's descriptors
        matches = bf.match(e_des, des) 
        #Sort best to worst matches based on distance (lower is better)
        matches = sorted(matches, key=lambda m: m.distance)

        # "Good" matches = simple distance threshold (tweak if needed)
        good = [m for m in matches if m.distance < 60]
        score = len(good)

    print(f"{name}: good_matches={score}")

    # Update best match if current score is higher
    if score > best_score:
        best_score = score
        best_path = path
        best_img = img
        best_kp = kp
        best_matches = good

print("\nBest match:", best_path)
print("Score:", best_score)

# Optional: Showing matches visually
vis = cv2.drawMatches(
    suspect_file, e_kp,
    best_img, best_kp,
    best_matches[:50],
    None,
    flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
)
cv2.imshow("ORB matches", vis)
cv2.waitKey(0)
cv2.destroyAllWindows()
