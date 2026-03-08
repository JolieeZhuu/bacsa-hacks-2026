from flask import Flask, request, jsonify, send_file
import os
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from werkzeug.utils import secure_filename
from DNAMatching.main import get_dna_ranking # most likely to least likely, 0: confidence (0-100), 1: score
import traceback
from ExtraFeatures import get_tod as calculate_tod  # ← rename import
from FingerprintExample.Fingerprint_analysis import fingerprint_ranking

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

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

@app.route('/api/rank', methods=['GET'])
def get_rank():
    try:
        ranking, topseq = get_dna_ranking()
        
        # Flatten: take the first crime scene sequence's ranking dict
        # and convert to [{id, confidence, score}, ...]
        formatted = []
        if ranking:
            for suspect_id, values in ranking[0].items():
                formatted.append({
                    'id': suspect_id,
                    'confidence': values[0],  # already 0-100
                    'score': values[1]         # raw alignment score
                })

        return jsonify({'ranking': formatted, 'topseq': topseq})
    except Exception as e:
        print(f"Ranking error: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/fingerprint_ranking', methods=['GET'])
def get_fingerprint_ranking():
    try:
        ranking = fingerprint_ranking()
        return jsonify({'ranking': ranking})
    except Exception as e:
        print(f"Fingerprint ranking error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/tod', methods=['POST'])
def tod_route():
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['body-temp', 'ambient-temp', 'discov-hour', 'discov-min']
        for field in required:
            if data.get(field) is None or data.get(field) == '':
                return jsonify({'error': f'Missing field: {field}'}), 400

        body_temp = float(data['body-temp'])
        ambient_temp = float(data['ambient-temp'])
        discov_h = int(data['discov-hour'])
        discov_m = int(data['discov-min'])

        # Validate ranges
        if not (0 <= discov_h <= 23):
            return jsonify({'error': 'Hour must be 0-23'}), 400
        if not (0 <= discov_m <= 59):
            return jsonify({'error': 'Minute must be 0-59'}), 400
        if not (0 <= body_temp <= 40):
            return jsonify({'error': 'Body temp seems invalid'}), 400

        hours, minutes, day = calculate_tod(body_temp, ambient_temp, discov_h, discov_m)
        return jsonify({'hours': hours, 'minutes': minutes, 'day': day})
    except ValueError as e:
        return jsonify({'error': f'Invalid number format: {e}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate_text():
    """
    Handles a POST request to the /generate route, takes a JSON request
    containing a prompt, passes it to the Gemini model, and returns the
    response as a JSON object.
    """
    data = request.get_json()
    prompt = data.get('prompt', '')

    if not prompt:
        return jsonify({'error': 'Prompt parameter is required'}), 400

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt
        )
        print(response.text)
        return jsonify({'response': response.text})
    except Exception as e:
        app.logger.error(f"Error with Gemini API: {e}")
        return jsonify({'error': 'An unexpected error occurred during AI generation'}), 500

@app.route('/api/crimescene_fingerprint', methods=['GET'])
def get_crimescene_fingerprint():
    path = os.path.join(FINGERPRINT_FOLDER, 'CrimeScene_Fingerprint.BMP')
    if not os.path.exists(path):
        return jsonify({'error': 'No fingerprint uploaded'}), 404
    return send_file(path, mimetype='image/bmp')

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, port=8000)