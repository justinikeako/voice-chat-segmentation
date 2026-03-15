# app/routes/profile.py
from flask import Blueprint, jsonify

profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Profile route active"})