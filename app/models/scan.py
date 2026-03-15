# app/models/scan.py
from app import db
from datetime import datetime

class Scan(db.Model):
    __tablename__ = 'scans'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Classification results
    hair_type = db.Column(db.String(10))         # 3A / 3B / 3C / 4A / 4B / 4C
    porosity = db.Column(db.String(20))
    texture = db.Column(db.String(20))
    curl_pattern = db.Column(db.String(100))
    scalp_score = db.Column(db.Integer)          # 1–10
    scalp_condition = db.Column(db.String(50))
    scalp_observations = db.Column(db.Text)

    # Raw AI response stored for debugging
    raw_gpt_response = db.Column(db.Text)
    ml_model_prediction = db.Column(db.String(10))  # What the CNN predicted
    ml_confidence = db.Column(db.Float)

    # Image reference (store path or Azure Blob URL)
    image_url = db.Column(db.String(500))