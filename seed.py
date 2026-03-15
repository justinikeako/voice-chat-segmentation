# seed.py
from dotenv import load_dotenv
load_dotenv()  # <-- This fixes the missing credentials error!

from app import create_app, db
from app.models.user import User
from app.models.seller import Seller, Product

app = create_app()

def seed_database():
    with app.app_context():
        print("[HairScan] Dropping existing tables (if any)...")
        db.drop_all()
        
        print("[HairScan] Creating tables in XAMPP MySQL...")
        db.create_all()

        try:
            # --- 1. SEED SELLERS ---
            print("[HairScan] Seeding Jamaican Sellers...")
            sellers =[
                Seller(name="Earth Elements Ja", location="Kingston", verified=True, phone="876-555-0101", instagram_url="https://instagram.com/earthelementsja"),
                Seller(name="Fontana Pharmacy", location="Kingston / MoBay", verified=True, phone="876-555-0202", website_url="https://fontanapharmacy.com"),
                Seller(name="Ocho Rios Natural Beauty", location="Ocho Rios", verified=False, phone="876-555-0303"),
                Seller(name="Spanish Town Hair Supplies", location="Spanish Town", verified=False, phone="876-555-0404")
            ]
            db.session.add_all(sellers)
            db.session.commit()

            # Retrieve seller IDs
            earth_elements = Seller.query.filter_by(name="Earth Elements Ja").first().id
            fontana = Seller.query.filter_by(name="Fontana Pharmacy").first().id
            ochi = Seller.query.filter_by(name="Ocho Rios Natural Beauty").first().id

            # --- 2. SEED BRANDED PRODUCTS ---
            print("[HairScan] Seeding Products mapped to hair types...")
            products =[
                Product(seller_id=earth_elements, name="Raw Shea Butter Twist Cream", brand="SheaMoisture", category="Styler", suitable_hair_types="Coily", suitable_porosity="High", price_jmd=2500.00, local_available=True),
                Product(seller_id=fontana, name="Jamaican Black Castor Oil Leave-In", brand="Sunny Isle", category="Conditioner", suitable_hair_types="Curly,Coily", suitable_porosity="High", price_jmd=1800.00, local_available=True),
                Product(seller_id=ochi, name="Thickening Deep Conditioner", brand="Mielle", category="Conditioner", suitable_hair_types="Coily", suitable_porosity="Low,Medium", price_jmd=3200.00, local_available=True),
                Product(seller_id=earth_elements, name="Flaxseed Curl Defining Gel", brand="Aunt Jackie's", category="Styler", suitable_hair_types="Curly", suitable_porosity="Medium", price_jmd=1500.00, local_available=True),
                Product(seller_id=fontana, name="Sulfate-Free Clarifying Shampoo", brand="Cantu", category="Shampoo", suitable_hair_types="Wavy,Curly,Coily", suitable_porosity="Low,Medium,High", price_jmd=1200.00, local_available=True)
            ]
            db.session.add_all(products)

            # --- 3. SEED HOME REMEDIES ---
            print("[HairScan] Seeding Home Remedies...")
            home_remedies =[
                Product(seller_id=None, name="Pure Aloe Vera Gel", brand="Local Market", category="Conditioner", suitable_hair_types="Wavy,Curly,Coily", suitable_porosity="Low,Medium,High", price_jmd=500.00, local_available=True),
                Product(seller_id=None, name="Raw Jamaican Black Castor Oil", brand="Local Market", category="Oil", suitable_hair_types="Curly,Coily", suitable_porosity="High", price_jmd=1000.00, local_available=True),
            ]
            db.session.add_all(home_remedies)

            # --- 4. SEED TEST USERS ---
            print("[HairScan] Seeding Test Users...")
            test_users =[
                User(email="test1@example.com", name="Kemar", hair_type="Coily", porosity="High", scalp_condition="Healthy", texture="coarse"),
                User(email="test2@example.com", name="Tasha", hair_type="Curly", porosity="Low", scalp_condition="Dry", texture="medium")
            ]
            db.session.add_all(test_users)

            db.session.commit()
            print("[HairScan] ✅ Database seeded successfully!")

        except Exception as e:
            db.session.rollback()
            print(f"[HairScan] ❌ Error seeding database: {e}")

if __name__ == '__main__':
    seed_database()