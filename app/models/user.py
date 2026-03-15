# app/models/user.py
from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to scans
    scans = db.relationship('Scan', backref='user', lazy=True)

    # Stored hair profile (populated after first scan)
    hair_type = db.Column(db.String(10))        # e.g. "4B"
    porosity = db.Column(db.String(20))         # Low / Medium / High
    scalp_condition = db.Column(db.String(50))  # Dry / Oily / Healthy etc.
    texture = db.Column(db.String(20))          # fine / medium / coarse