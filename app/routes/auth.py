# app/routes/auth.py
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.user import User
import jwt
import datetime
import logging

auth_bp = Blueprint('auth_bp', __name__)


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        'iat': datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def token_required(f):
    """Decorator to protect routes with JWT auth."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if not token:
            return jsonify({'error': 'Token required'}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


@auth_bp.route('/signup', methods=['POST'])
def signup():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'No JSON body'}), 400

    email = body.get('email', '').strip().lower()
    name = body.get('name', '').strip()
    password = body.get('password', '')

    if not email or not name or not password:
        return jsonify({'error': 'Email, name, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(email=email, name=name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    logging.info(f"[Kera AI] New user registered: {email}")

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'No JSON body'}), 400

    email = body.get('email', '').strip().lower()
    password = body.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user.id)

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'hair_type': user.hair_type,
            'porosity': user.porosity,
            'scalp_condition': user.scalp_condition
        }
    })


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'name': current_user.name,
            'hair_type': current_user.hair_type,
            'porosity': current_user.porosity,
            'scalp_condition': current_user.scalp_condition,
            'texture': current_user.texture
        }
    })
