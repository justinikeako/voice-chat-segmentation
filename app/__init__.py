# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_cors import CORS
import os
import logging

db = SQLAlchemy()
# Allow all origins for the hackathon demo
socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)
    
    # Load environment variables (ensure python-dotenv is loaded in run.py)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///hairscan_dev.db') # Fallback to sqlite for dev testing
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

    # Setup Logging
    logging.basicConfig(level=logging.INFO)
    app.logger.info("[HairScan] Initializing Flask Application...")

    CORS(app)
    db.init_app(app)
    socketio.init_app(app)

    # Import Blueprints
    from app.routes.analyse import analyse_bp
    from app.routes.profile import profile_bp
    from app.routes.sellers import sellers_bp
    from app.routes.marketplace import marketplace_bp

    # Register Blueprints
    app.register_blueprint(analyse_bp, url_prefix='/api/analyse')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(sellers_bp, url_prefix='/api/sellers')
    app.register_blueprint(marketplace_bp, url_prefix='/api/marketplace')

    return app