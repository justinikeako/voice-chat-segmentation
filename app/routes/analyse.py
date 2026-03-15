# app/routes/analyse.py
from flask import Blueprint, request, jsonify
from app import db
from app.models.scan import Scan
from app.models.user import User
from app.services.agent_orchestrator import run_kera_ai_pipeline
import logging
import os

analyse_bp = Blueprint('analyse_bp', __name__)

@analyse_bp.route('/', methods=['POST'])
def analyse_hair():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400

    file = request.files['image']
    user_id = request.form.get('user_id')

    if file.filename == '':
        return jsonify({"status": "error", "message": "Empty file name"}), 400

    try:
        image_bytes = file.read()
        logging.info("[Kera AI] Starting Multi-Agent Analysis Pipeline...")
        analysis_result = run_kera_ai_pipeline(image_bytes)
        
        if "error" in analysis_result:
            return jsonify({"status": "error", "message": analysis_result["error"]}), 500

        # Save to database using the EXACT subtype (e.g., 4C)
        if user_id:
            user = User.query.get(user_id)
            if user:
                new_scan = Scan(
                    user_id=user.id,
                    hair_type=analysis_result.get("exact_subtype", "Unknown"), # <-- Updated
                    porosity=analysis_result.get("porosity"),
                    texture=analysis_result.get("texture"),
                    curl_pattern=analysis_result.get("curl_pattern"),
                    scalp_score=analysis_result.get("scalp_score"),
                    scalp_condition=analysis_result.get("scalp_condition"),
                    ml_model_prediction=analysis_result["debug_metrics"]["mobilenet_pred"],
                    ml_confidence=analysis_result["debug_metrics"]["mobilenet_conf"]
                )
                db.session.add(new_scan)
                
                user.hair_type = analysis_result.get("exact_subtype", "Unknown") # <-- Updated
                user.porosity = analysis_result.get("porosity")
                user.scalp_condition = analysis_result.get("scalp_condition")
                user.texture = analysis_result.get("texture")
                
                db.session.commit()
                analysis_result["scan_id"] = new_scan.id

        return jsonify({"status": "ok", "data": analysis_result})

    except Exception as e:
        logging.error(f"[Kera AI] Error in analyse route: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


        # ── 1. LIVE ANALYSIS ENDPOINT (lightweight, no DB save) ──────────────────────
@analyse_bp.route('/live', methods=['POST'])
def live_analyse():
    """
    Fast endpoint for real-time streaming analysis on the ScanPage.
    Runs ONLY the two CNNs (no GPT-5) so it's fast enough for every 4 seconds.
    Returns just hair_type + confidence — no DB save.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image"}), 400
 
    try:
        from app.services.azure_ml import predict_hair_type as cv_predict
        from app.services.local_ml import predict_local_mobilenet
 
        image_bytes = request.files['image'].read()
 
        cv_result = cv_predict(image_bytes)
        mn_result = predict_local_mobilenet(image_bytes)
 
        # Simple consensus: if they agree, use that. Otherwise trust Custom Vision.
        cv_pred = cv_result.get("hair_type", "Unknown")
        mn_pred = mn_result.get("hair_type", "Unknown")
        cv_conf = cv_result.get("confidence", 0.0)
        mn_conf = mn_result.get("confidence", 0.0)
 
        if cv_pred.lower() == mn_pred.lower() and cv_pred != "Unknown":
            final = cv_pred
            conf  = max(cv_conf, mn_conf)
        else:
            # Fallback: highest confidence wins
            if cv_conf >= mn_conf:
                final, conf = cv_pred, cv_conf
            else:
                final, conf = mn_pred, mn_conf
 
        return jsonify({"hair_type": final, "confidence": round(conf, 3)})
 
    except Exception as e:
        logging.error(f"[Kera AI] Live analysis error: {e}")
        return jsonify({"error": str(e)}), 500
 
 
# ── 2. CHAT ENDPOINT ─────────────────────────────────────────────────────────
# Also add this import at the TOP of analyse.py:
# from openai import AzureOpenAI
 
@analyse_bp.route('/chat/', methods=['POST'])
# NOTE: Register this on a SEPARATE blueprint in production.
# For hackathon speed, adding it here on analyse_bp is fine.
# Registered at: /api/analyse/chat/ (matches what KeraChatPage.jsx calls: /api/chat/)
# So ALSO add this to app/__init__.py if you want /api/chat/:
#   from app.routes.chat import chat_bp
#   app.register_blueprint(chat_bp, url_prefix='/api/chat')
# OR just change the URL in KeraChatPage.jsx to: 'http://127.0.0.1:5000/api/analyse/chat/'
def kera_chat():
    """
    Kera AI conversational endpoint.
    Receives: { system: str, messages: [{role, content}] }
    Returns:  { reply: str }
    """
    body = request.get_json()
    if not body:
        return jsonify({"error": "No JSON body"}), 400
 
    system_prompt = body.get("system", "You are Kera, an expert hair advisor.")
    messages      = body.get("messages", [])
    image         = body.get("image", None) # Expected: data:image/jpeg;base64,...

    if not messages:
        return jsonify({"error": "No messages"}), 400

    if image and messages[-1]["role"] == "user":
        orig = messages[-1]["content"]
        messages[-1]["content"] = [
            {"type": "text", "text": orig},
            {"type": "image_url", "image_url": {"url": image}}
        ]

    try:
        from openai import AzureOpenAI
 
        client = AzureOpenAI(
            api_key      = os.getenv("AZURE_API_KEY"),
            api_version  = os.getenv("AZURE_API_VERSION"),
            azure_endpoint = os.getenv("AZURE_API_BASE")
        )
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")
 
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            max_tokens=300,
            temperature=0.7
        )
 
        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})
 
    except Exception as e:
        logging.error(f"[Kera AI Chat] Error: {e}")
        return jsonify({"reply": "Sorry, I'm having trouble connecting right now. Please try again in a moment!"}), 200
 
 
# ============================================================
# ALSO ADD TO app/routes/analyse.py at the very top:
# import os
# ============================================================
 
 
# ============================================================
# UPDATE App.jsx — add these two lines:
#
# import KeraChatPage from './pages/KeraChatPage';
# <Route path="/chat" element={<KeraChatPage />} />
#
# ── ALSO update the URL in KeraChatPage.jsx line ~108:
# Change: 'http://127.0.0.1:5000/api/chat/'
# To:     'http://127.0.0.1:5000/api/analyse/chat/'
# (because we registered chat on analyse_bp)
# ============================================================
 
 
# ============================================================
# ADD TO public/index.html <head> for MediaPipe on ScanPage:
#
# <script src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js" crossorigin="anonymous"></script>
#
# ============================================================