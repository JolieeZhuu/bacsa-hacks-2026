from flask import Flask, request, jsonify
import os
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# Base directory = wherever app.py lives (inside /api)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Target folders
FINGERPRINT_FOLDER = os.path.join(BASE_DIR, 'FingerprintExample')
DNA_FOLDER         = os.path.join(BASE_DIR, 'DNAMatching')
SUSPECT_FOLDER     = os.path.join(BASE_DIR, 'FingerprintExample', 'Suspect_Fingerprints')

# Ensure folders exist on startup
os.makedirs(FINGERPRINT_FOLDER, exist_ok=True)
os.makedirs(DNA_FOLDER, exist_ok=True)
os.makedirs(SUSPECT_FOLDER, exist_ok=True)


@app.route('/api/upload', methods=['POST'])
def upload_files():
    try:
        fingerprint   = request.files.get('crimescene-fingerprint-bmp')
        dna           = request.files.get('crimescene-dna-fasta')
        suspect_dna   = request.files.get('suspect-dna-fasta')
        suspect_files = request.files.getlist('suspect-folder')

        # CrimeScene_Fingerprint.BMP → api/FingerprintExample/
        if fingerprint and fingerprint.filename:
            save_path = os.path.join(FINGERPRINT_FOLDER, 'CrimeScene_Fingerprint.BMP')
            fingerprint.save(save_path)
            print(f"Saved fingerprint to: {save_path}")

        # CrimeScene_DNA.fasta → api/DNAMatching/
        if dna and dna.filename:
            save_path = os.path.join(DNA_FOLDER, 'CrimeScene_DNA.fasta')
            dna.save(save_path)
            print(f"Saved crime scene DNA to: {save_path}")

        # Suspect_DNA.fasta → api/DNAMatching/
        if suspect_dna and suspect_dna.filename:
            save_path = os.path.join(DNA_FOLDER, 'Suspect_DNA.fasta')
            suspect_dna.save(save_path)
            print(f"Saved suspect DNA to: {save_path}")

        # All suspect .bmp files → api/FingerprintExample/Suspect_Fingerprints/
        for f in suspect_files:
            if f and f.filename:
                filename = secure_filename(f.filename)
                save_path = os.path.join(SUSPECT_FOLDER, filename)
                f.save(save_path)
                print(f"Saved suspect file to: {save_path}")

        return jsonify({'status': 'success'})

    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8000)