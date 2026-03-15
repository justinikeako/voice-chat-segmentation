# app/routes/marketplace.py
# Full marketplace: Amazon search, local products, weekly hair check, product scan
import os, logging, requests as req
from flask import Blueprint, request, jsonify
from app import db
from app.models.scan import Scan
from app.models.seller import Product
from app.models.user import User
from datetime import datetime, timedelta

marketplace_bp = Blueprint('marketplace_bp', __name__)

RAPIDAPI_KEY  = os.getenv('RAPIDAPI_KEY', '')
RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com'

# ── Hair type → best search terms ────────────────────────────────────────────
HAIR_TYPE_QUERIES = {
    '4C': ['SheaMoisture 4C hair products', 'Mielle organics 4C coily hair', 'As I Am 4C coils'],
    '4B': ['SheaMoisture 4B hair', 'Camille Rose 4B coils moisturizer', 'Cantu 4B hair cream'],
    '4A': ['SheaMoisture 4A curl cream', 'Aunt Jackie curls 4A coily', 'DevaCurl 4A'],
    '3C': ['SheaMoisture 3C curl defining cream', 'Mixed Chicks 3C curls', 'Kinky Curly 3C'],
    '3B': ['DevaCurl 3B ringlets', 'SheaMoisture 3B curl enhancing', 'Cantu curling cream 3B'],
    '3A': ['SheaMoisture 3A loose curls shampoo', 'OGX wavy curly 3A', 'Not Your Mothers 3A'],
    '2C': ['SheaMoisture wavy hair 2C', 'Briogeo wavy 2C curl', 'Bounce Curl 2C'],
    '2B': ['OGX 2B wavy shampoo conditioner', 'Shea Moisture wavy 2B', 'Herbal Essences 2B'],
    '2A': ['Giovanni 2A wavy lightweight', 'Not Your Mother wavy 2A', 'Aussie wavy hair'],
    'Coily': ['SheaMoisture coily hair deep conditioner', 'Mielle organics coily hair oil', 'As I Am coily hair'],
    'Curly': ['SheaMoisture curl cream', 'DevaCurl no poo shampoo', 'Cantu curl activator'],
    'Wavy': ['OGX wavy hair shampoo', 'Shea Moisture wavy hair', 'Not Your Mother wavy'],
    'Straight': ['OGX argan oil shampoo straight hair', 'Pantene smooth straight', 'Garnier fructis straight'],
}

# ── Local seeded product fallback (used when offline or Amazon fails) ─────────
LOCAL_PRODUCT_DB = {
    'Coily': [
        {'name': 'Raw Shea Butter Twist Cream', 'brand': 'SheaMoisture', 'category': 'Styler',
         'reason': 'Rich moisture for tight coils', 'store_description': 'Look for a cream or butter-based styler with shea butter and castor oil. Tell the cashier you have 4C coily hair and need a twisting cream.'},
        {'name': 'Jamaican Black Castor Oil', 'brand': 'Sunny Isle', 'category': 'Oil',
         'reason': 'Strengthens and conditions coily strands', 'store_description': 'Ask for Jamaican Black Castor Oil — the bottle is dark with a yellow label. Used for scalp massages and sealing in moisture.'},
    ],
    'Curly': [
        {'name': 'Curl Enhancing Smoothie', 'brand': 'SheaMoisture', 'category': 'Styler',
         'reason': 'Defines curls and reduces frizz', 'store_description': 'Ask for a curl defining cream with coconut oil and hibiscus. Tell them your hair is Type 3 curly and you want frizz control.'},
        {'name': 'DevaCurl No-Poo', 'brand': 'DevaCurl', 'category': 'Shampoo',
         'reason': 'Sulfate-free cleanser that preserves curl pattern', 'store_description': 'Ask for a sulfate-free cleansing conditioner — no foam, no lather. It cleans without stripping natural oils from curls.'},
    ],
    'Wavy': [
        {'name': 'Wave Spray', 'brand': 'Not Your Mother\'s', 'category': 'Styler',
         'reason': 'Enhances natural wave without crunch', 'store_description': 'Ask for a lightweight wave spray or mousse for 2A-2C wavy hair. Should be alcohol-free to avoid frizz.'},
    ],
    'Straight': [
        {'name': 'Argan Oil Shampoo', 'brand': 'OGX', 'category': 'Shampoo',
         'reason': 'Adds shine to straight hair without weight', 'store_description': 'Ask for a moisturizing shampoo with argan oil for smooth, straight hair. Avoid volumizing formulas.'},
    ],
}


def get_hair_group(hair_type: str) -> str:
    """Map subtype like 4C → Coily for local fallback lookups"""
    if not hair_type:
        return 'Coily'
    t = hair_type.upper()
    if t.startswith('4') or t == 'COILY':
        return 'Coily'
    elif t.startswith('3') or t == 'CURLY':
        return 'Curly'
    elif t.startswith('2') or t == 'WAVY':
        return 'Wavy'
    elif t.startswith('1') or t == 'STRAIGHT':
        return 'Straight'
    return 'Coily'


# ── 1. Amazon Product Search ──────────────────────────────────────────────────
@marketplace_bp.route('/products', methods=['GET'])
def get_products():
    """
    Search Amazon for hair products matching the user's hair type.
    Falls back to local seeded data if Amazon is unavailable.
    Query params: hair_type (e.g. 4C), category (optional: Shampoo/Conditioner/Oil/Styler)
    """
    hair_type = request.args.get('hair_type', '4C')
    category  = request.args.get('category', '')

    # Build query
    queries   = HAIR_TYPE_QUERIES.get(hair_type, HAIR_TYPE_QUERIES.get(get_hair_group(hair_type), ['natural hair products']))
    query     = queries[0]
    if category:
        query = f'{category} {query}'

    try:
        response = req.get(
            f'https://{RAPIDAPI_HOST}/search',
            headers={
                'x-rapidapi-key':  RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST,
                'Content-Type':    'application/json',
            },
            params={
                'query':             query,
                'page':              '1',
                'country':           'US',
                'sort_by':           'REVIEWS',
                'product_condition': 'NEW',
                'is_prime':          'false',
            },
            timeout=8
        )
        response.raise_for_status()
        data     = response.json()
        products = data.get('data', {}).get('products', [])[:8]

        results = []
        for p in products:
            if not p.get('product_title'):
                continue
            results.append({
                'source':      'amazon',
                'name':        p.get('product_title', '')[:80],
                'brand':       p.get('brand', ''),
                'price':       p.get('product_price', 'N/A'),
                'rating':      p.get('product_star_rating', ''),
                'reviews':     p.get('product_num_ratings', 0),
                'image':       p.get('product_photo', ''),
                'amazon_url':  p.get('product_url', ''),
                'asin':        p.get('asin', ''),
                'prime':       p.get('is_prime', False),
                'reason':      f'Top-rated for {hair_type} hair type',
                'store_description': f'Ask for {p.get("brand", "this product")} — it\'s highly rated for {hair_type} hair. Show this screen to the store assistant.',
            })

        if results:
            return jsonify({'source': 'amazon', 'products': results, 'hair_type': hair_type})

    except Exception as e:
        logging.warning(f'[Marketplace] Amazon API failed: {e} — falling back to local data')

    # ── Offline fallback: local seeded DB ─────────────────────────────────
    group         = get_hair_group(hair_type)
    local_matches = LOCAL_PRODUCT_DB.get(group, LOCAL_PRODUCT_DB['Coily'])

    # Also query from the seeded Product model
    db_products = Product.query.filter(
        Product.suitable_hair_types.like(f'%{hair_type}%')
    ).limit(6).all()

    local_results = []
    for p in local_matches:
        local_results.append({
            'source':            'local',
            'name':              p['name'],
            'brand':             p['brand'],
            'category':          p['category'],
            'reason':            p['reason'],
            'store_description': p['store_description'],
            'price':             'N/A',
            'image':             '',
            'amazon_url':        '',
        })
    for p in db_products:
        local_results.append({
            'source':            'local_db',
            'name':              p.name,
            'brand':             p.brand or '',
            'category':          p.category or '',
            'reason':            f'Recommended for {hair_type} hair',
            'store_description': f'Ask for {p.brand} {p.name}. Suitable for {p.suitable_hair_types} hair.',
            'price':             f'JMD {p.price_jmd:.0f}' if p.price_jmd else 'N/A',
            'image':             '',
            'amazon_url':        p.amazon_url or '',
        })

    return jsonify({'source': 'local', 'products': local_results, 'hair_type': hair_type})


# ── 2. Natural Remedies ───────────────────────────────────────────────────────
NATURAL_REMEDIES = {
    'Coily': [
        {'name': 'Avocado Deep Mask', 'emoji': '🥑',
         'ingredients': ['1 ripe avocado', '2 tbsp olive oil', '1 tbsp honey'],
         'steps': 'Mash avocado, mix in oil and honey. Apply to damp hair for 30 min under a plastic cap. Rinse with cool water.',
         'benefit': 'Intense moisture + protein for 4C coils'},
        {'name': 'Castor Oil Scalp Massage', 'emoji': '🌿',
         'ingredients': ['2 tbsp Jamaican black castor oil', '5 drops peppermint essential oil'],
         'steps': 'Mix oils, warm slightly. Section hair and massage into scalp with fingertips for 5 min. Leave overnight for best results.',
         'benefit': 'Promotes growth and relieves dry scalp'},
        {'name': 'Banana & Honey Moisture Pack', 'emoji': '🍌',
         'ingredients': ['1 ripe banana', '1 tbsp raw honey', '1 tbsp coconut oil'],
         'steps': 'Blend smooth, apply root to tip. Cover with shower cap for 20 min. Rinse thoroughly (strain through fine cloth to avoid pieces).',
         'benefit': 'Softens and adds slip to coily hair'},
    ],
    'Curly': [
        {'name': 'Coconut Milk Rinse', 'emoji': '🥥',
         'ingredients': ['½ cup coconut milk', '1 tbsp honey', '2 tbsp aloe vera gel'],
         'steps': 'Whisk together. Pour over clean, damp hair and work through curls. Leave 15 min then rinse cold.',
         'benefit': 'Defines curls and adds shine'},
        {'name': 'Aloe Vera Curl Refresher', 'emoji': '🌱',
         'ingredients': ['3 tbsp fresh aloe vera gel', '1 cup water', '2 drops rosemary oil'],
         'steps': 'Mix in spray bottle. Shake well and spritz on second-day curls. Scrunch to reactivate curl pattern.',
         'benefit': 'Refreshes curls without washing'},
    ],
    'Wavy': [
        {'name': 'Apple Cider Vinegar Rinse', 'emoji': '🍎',
         'ingredients': ['2 tbsp apple cider vinegar', '1 cup water'],
         'steps': 'Mix and pour over hair after shampooing. Leave 2 min then rinse. Do once per week.',
         'benefit': 'Removes buildup and enhances wave definition'},
    ],
    'Straight': [
        {'name': 'Egg & Olive Oil Treatment', 'emoji': '🥚',
         'ingredients': ['1 egg', '2 tbsp olive oil', '1 tbsp lemon juice'],
         'steps': 'Whisk together. Apply to hair for 20 min. Rinse with cool water (never hot — it cooks the egg).',
         'benefit': 'Strengthens and adds natural shine to straight hair'},
    ],
}

@marketplace_bp.route('/remedies', methods=['GET'])
def get_remedies():
    hair_type = request.args.get('hair_type', '4C')
    group     = get_hair_group(hair_type)
    remedies  = NATURAL_REMEDIES.get(group, NATURAL_REMEDIES['Coily'])
    return jsonify({'remedies': remedies, 'hair_type': hair_type})


# ── 3. Weekly Hair Check — save + retrieve ────────────────────────────────────
@marketplace_bp.route('/weekly-check', methods=['POST'])
def save_weekly_check():
    """
    Save a weekly hair quality check. Lightweight — no full pipeline,
    just GPT vision assessment of current hair condition.
    Body: { user_id, image (base64), notes (optional) }
    """
    body    = request.get_json()
    user_id = body.get('user_id', 1)
    image   = body.get('image', '')
    notes   = body.get('notes', '')

    if not image:
        return jsonify({'error': 'No image provided'}), 400

    try:
        import os
        from openai import AzureOpenAI

        client = AzureOpenAI(
            api_key=os.getenv('AZURE_API_KEY'),
            api_version=os.getenv('AZURE_API_VERSION'),
            azure_endpoint=os.getenv('AZURE_API_BASE')
        )
        deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-5-chat')

        response = client.chat.completions.create(
            model=deployment,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': (
                        'You are a hair health assessor. Look at this hair image and give a quick weekly check-in. '
                        'Return ONLY valid JSON with no markdown:\n'
                        '{"quality_score": 7, "moisture_level": "Good", "scalp_condition": "Healthy", '
                        '"shrinkage_percent": 70, "weekly_note": "one sentence observation", '
                        '"action_needed": "one short tip"}'
                        '\nquality_score is 1-10. moisture_level is Dry/Low/Good/High. '
                        'shrinkage_percent is estimated 0-100.'
                    )},
                    {'type': 'image_url', 'image_url': {'url': image}}
                ]
            }],
            max_tokens=150,
            temperature=0.2
        )

        import json
        raw  = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            parts = raw.split('```')
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith('json'):
                raw = raw[4:]

        try:
            result = json.loads(raw.strip())
        except (json.JSONDecodeError, ValueError):
            logging.error(f'[Weekly Check] GPT returned invalid JSON: {raw[:200]}')
            return jsonify({'error': 'AI returned an unexpected response — please try again.'}), 502

        # Save as a lightweight scan record
        scan = Scan(
            user_id=user_id,
            scalp_score=result.get('quality_score', 5),
            scalp_condition=result.get('scalp_condition', 'Unknown'),
            raw_gpt_response=json.dumps({'weekly_check': result, 'notes': notes}),
        )
        db.session.add(scan)
        db.session.commit()

        result['scan_id']   = scan.id
        result['date']      = scan.created_at.isoformat()
        result['notes']     = notes
        return jsonify(result)

    except Exception as e:
        db.session.rollback()
        logging.error(f'[Weekly Check] Error: {e}')
        return jsonify({'error': str(e)}), 500


@marketplace_bp.route('/hair-history/<int:user_id>', methods=['GET'])
def get_hair_history(user_id):
    """Returns all scans for the user, ordered by date, for the timeline chart."""
    scans = Scan.query.filter_by(user_id=user_id).order_by(Scan.created_at.asc()).all()
    import json

    history = []
    for s in scans:
        entry = {
            'id':              s.id,
            'date':            s.created_at.isoformat(),
            'hair_type':       s.hair_type or '',
            'scalp_score':     s.scalp_score or 0,
            'scalp_condition': s.scalp_condition or '',
            'porosity':        s.porosity or '',
            'texture':         s.texture or '',
        }
        # Unpack weekly check extras if present
        if s.raw_gpt_response:
            try:
                raw = json.loads(s.raw_gpt_response)
                if 'weekly_check' in raw:
                    wc = raw['weekly_check']
                    entry['moisture_level']    = wc.get('moisture_level', '')
                    entry['shrinkage_percent'] = wc.get('shrinkage_percent', 0)
                    entry['weekly_note']       = wc.get('weekly_note', '')
                    entry['action_needed']     = wc.get('action_needed', '')
                    entry['notes']             = raw.get('notes', '')
                    entry['is_weekly_check']   = True
            except Exception:
                pass
        history.append(entry)

    return jsonify({'history': history, 'count': len(history)})


# ── 4. Scan Product (in-store / label scan) ───────────────────────────────────
@marketplace_bp.route('/scan-product', methods=['POST'])
def scan_product():
    """
    User points camera at a product bottle/shelf.
    GPT vision identifies the product and says if it's good/bad for their hair.
    Body: { image (base64), hair_type, hair_profile (optional JSON string) }
    """
    body         = request.get_json()
    image        = body.get('image', '')
    hair_type    = body.get('hair_type', '4C')
    hair_profile = body.get('hair_profile', '')

    if not image:
        return jsonify({'error': 'No image provided'}), 400

    try:
        import os
        from openai import AzureOpenAI
        import json

        client = AzureOpenAI(
            api_key=os.getenv('AZURE_API_KEY'),
            api_version=os.getenv('AZURE_API_VERSION'),
            azure_endpoint=os.getenv('AZURE_API_BASE')
        )
        deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-5-chat')

        profile_context = f' The user has {hair_type} hair.' + (f' Profile: {hair_profile}' if hair_profile else '')

        response = client.chat.completions.create(
            model=deployment,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': (
                        f'You are Kera AI, a hair product expert.{profile_context} '
                        'Look at this image of a hair product or shelf. Identify the product(s) and rate them for this user\'s hair type. '
                        'Return ONLY valid JSON with no markdown:\n'
                        '{"products_detected": ["Product Name"], "verdict": "GOOD|BAD|OK", '
                        '"confidence": 85, "reason": "one sentence why", '
                        '"key_ingredients_found": ["ingredient1"], '
                        '"ingredients_to_avoid_found": ["ingredient2"], '
                        '"recommendation": "one action sentence for the user"}'
                    )},
                    {'type': 'image_url', 'image_url': {'url': image}}
                ]
            }],
            max_tokens=200,
            temperature=0.2
        )

        import json
        raw = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            parts = raw.split('```')
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith('json'):
                raw = raw[4:]

        try:
            result = json.loads(raw.strip())
        except (json.JSONDecodeError, ValueError):
            logging.error(f'[Scan Product] GPT returned invalid JSON: {raw[:200]}')
            return jsonify({'error': 'AI returned an unexpected response — please try again.'}), 502

        return jsonify(result)

    except Exception as e:
        logging.error(f'[Scan Product] Error: {e}')
        return jsonify({'error': str(e)}), 500


# ── 5. Local Stores Near User ─────────────────────────────────────────────────
@marketplace_bp.route('/local-stores', methods=['GET'])
def get_local_stores():
    """Returns seeded Jamaican hair/beauty stores with map data."""
    stores = [
        {'name': 'Fontana Pharmacy',         'location': 'Kingston / MoBay', 'lat': 17.9970, 'lng': -76.7936, 'phone': '876-555-0202', 'type': 'Pharmacy', 'verified': True,  'website': 'https://fontanapharmacy.com'},
        {'name': 'Earth Elements Ja',         'location': 'Kingston',         'lat': 17.9774, 'lng': -76.8200, 'phone': '876-555-0101', 'type': 'Natural Beauty', 'verified': True,  'instagram': 'https://instagram.com/earthelementsja'},
        {'name': 'Ocho Rios Natural Beauty',  'location': 'Ocho Rios',        'lat': 18.4035, 'lng': -77.1042, 'phone': '876-555-0303', 'type': 'Beauty Supply', 'verified': False, 'website': None},
        {'name': 'Spanish Town Hair Supplies','location': 'Spanish Town',     'lat': 17.9900, 'lng': -76.9530, 'phone': '876-555-0404', 'type': 'Hair Supply',   'verified': False, 'website': None},
        {'name': 'Half Way Tree Beauty Depot','location': 'Half Way Tree, Kingston', 'lat': 18.0094, 'lng': -76.7960, 'phone': '876-555-0505', 'type': 'Beauty Supply', 'verified': True,  'website': None},
    ]
    return jsonify({'stores': stores})


# ── 6. Ping ───────────────────────────────────────────────────────────────────
@marketplace_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok', 'message': 'Marketplace route active'})