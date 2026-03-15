# run.py
from dotenv import load_dotenv
load_dotenv()  # Load .env variables before creating the app

from app import create_app, db, socketio

app = create_app()

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.logger.info("[HairScan] Starting server with Flask-SocketIO...")
    # Always use socketio.run instead of app.run when using WebSockets
    socketio.run(app, debug=True, port=5000)