# app/services/azure_ml.py
import requests
import os
import logging

CV_ENDPOINT = os.getenv('AZURE_CUSTOM_VISION_ENDPOINT')
CV_KEY = os.getenv('AZURE_CUSTOM_VISION_KEY')

def predict_hair_type(image_bytes: bytes) -> dict:
    """
    Sends an image directly to Azure Custom Vision (Iteration 2).
    """
    if not CV_ENDPOINT or not CV_KEY:
        return {"error": "Azure Custom Vision not configured", "hair_type": "Unknown"}

    try:
        logging.info("[Kera AI] Sending image to Azure Custom Vision...")
        
        headers = {
            "Prediction-Key": CV_KEY,
            "Content-Type": "application/octet-stream"
        }
        
        response = requests.post(CV_ENDPOINT, headers=headers, data=image_bytes, timeout=15)
        response.raise_for_status()
        result = response.json()
        
        predictions = result.get('predictions',[])
        if not predictions:
            return {"error": "No predictions returned from model", "hair_type": "Unknown", "confidence": 0.0}
            
        # The first item is the highest probability
        top_prediction = predictions[0]
        predicted_tag = top_prediction.get('tagName', 'Unknown').capitalize()
        confidence = top_prediction.get('probability', 0.0)

        logging.info(f"[Kera AI] Custom Vision Prediction: {predicted_tag} (Confidence: {confidence*100:.1f}%)")

        return {
            "hair_type": predicted_tag,
            "confidence": round(confidence, 3)
        }
        
    except requests.Timeout:
        logging.error("[Kera AI] Custom Vision request timed out.")
        return {"error": "Model endpoint timeout", "hair_type": "Unknown", "confidence": 0.0}
    except Exception as e:
        logging.error(f"[Kera AI] Custom Vision prediction failed: {str(e)}")
        return {"error": str(e), "hair_type": "Unknown", "confidence": 0.0}