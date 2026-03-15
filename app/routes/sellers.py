# app/routes/sellers.py
from flask import Blueprint, jsonify

sellers_bp = Blueprint('sellers_bp', __name__)

@sellers_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Sellers route active"})