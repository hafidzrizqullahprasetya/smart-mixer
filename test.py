from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory
from functools import wraps
import json
import socketio

app = Flask(__name__)
app.secret_key = 'kunci_rahasia_anda'

# Load users dari JSON
def load_users():
    try:
        with open('users.json', 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {"users": []}

# Decorator untuk mengecek login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Silakan login terlebih dahulu', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function



if __name__ == '__main__':
    app.run(debug=True)