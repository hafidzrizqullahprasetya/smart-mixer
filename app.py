from flask import Flask, render_template, request, jsonify, session, flash, redirect, url_for, send_from_directory
from functools import wraps
from socketio_instance import socketio
from models.concrete_monitor import ConcreteQualityMonitor
import json

app = Flask(__name__,
    static_folder='static',
    template_folder='templates'
)
app.config['SECRET_KEY'] = 'secret!'
app.config['DEBUG'] = True

# Inisialisasi instance ConcreteQualityMonitor
concrete_monitor = ConcreteQualityMonitor()

# Hubungkan Flask dengan SocketIO
socketio.init_app(app)

def load_users():
    try:
        with open('users.json', 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {"users": []}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Silakan login terlebih dahulu', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        users = load_users()
        
        for user in users['users']:
            if user['username'] == username and user['password'] == password:
                session['username'] = username
                return jsonify({
                    'success': True,
                    'message': 'Login berhasil!'
                })
        
        return jsonify({
            'success': False,
            'message': 'Username atau password salah!'
        }), 401

    return render_template('index.html')

@app.route('/simulasi')
@login_required
def simulasi():
    return render_template('simulasi.html', username=session['username'])

@app.route('/logout')
def logout():
    session.pop('username', None)
    return jsonify({
        'success': True,
        'message': 'Berhasil logout'
    })

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/start_simulation', methods=['POST'])
@login_required
def start_simulation():
    try:
        data = request.get_json()
        volume = float(data.get('volume', 0))
        temp_scheme = data.get('temperature_scheme', 'normal')

        if volume < 5 or volume > 20:
            return jsonify({"error": "Volume harus antara 5-20 liter"}), 400

        concrete_monitor.volume = volume
        concrete_monitor.temperature_scheme = temp_scheme
        concrete_monitor.start_simulation_thread()
        
        return jsonify({"status": "Simulasi dimulai"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/stop_simulation', methods=['POST'])
@login_required
def stop_simulation():
    try:
        concrete_monitor.stop_simulation()
        return jsonify({"status": "Simulasi dihentikan"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    try:
        socketio.run(
            app,
            debug=True,  # Set ke False untuk production
            host='0.0.0.0',
            port=5000,
            allow_unsafe_werkzeug=True  # Tambahkan ini untuk development
        )
    except KeyboardInterrupt:
        print("Server shutting down...")
    except Exception as e:
        print(f"An error occurred: {e}")