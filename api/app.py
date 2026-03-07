# from flask import Flask, request, render_template

# app = Flask(__name__)

# @app.route('/')
# def hello_world():
#     return 'Hello World'

# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         name = request.form['username']
#         return f"Hello {name}, POST request received"
#     return render_template('name.html')

# if __name__ == '__main__':
#     app.run(debug=True)

import time
from flask import Flask

app = Flask(__name__)

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/upload/file')
def get_file():
    return

@app.route('/upload/folder')
def get_folder():
    return