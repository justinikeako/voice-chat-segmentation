# run.py
import os
from dotenv import load_dotenv
load_dotenv()  # Load .env variables before creating the app

from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.logger.info("[HairScan] Starting server with Flask-SocketIO...")
    # Always use socketio.run instead of app.run when using WebSockets
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)