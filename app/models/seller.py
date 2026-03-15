# app/models/seller.py
from app import db
from datetime import datetime

class Seller(db.Model):
    __tablename__ = 'sellers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255))          # Kingston / MoBay / Spanish Town / Online
    instagram_url = db.Column(db.String(500))
    website_url = db.Column(db.String(500))
    phone = db.Column(db.String(50))
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to products
    products = db.relationship('Product', backref='seller', lazy=True)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    brand = db.Column(db.String(255))
    category = db.Column(db.String(100))             # Shampoo / Conditioner / Oil / Styler
    suitable_hair_types = db.Column(db.String(100))  # "4A,4B,4C"
    suitable_porosity = db.Column(db.String(50))     # "Low,Medium"
    avoid_hair_types = db.Column(db.String(100))
    price_jmd = db.Column(db.Float)
    in_stock = db.Column(db.Boolean, default=True)
    amazon_url = db.Column(db.String(500))
    local_available = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)