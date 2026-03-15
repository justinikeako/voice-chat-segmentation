# app/routes/marketplace.py
from flask import Blueprint, jsonify

marketplace_bp = Blueprint('marketplace_bp', __name__)

@marketplace_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Marketplace route active"})