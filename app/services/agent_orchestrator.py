# app/services/agent_orchestrator.py
import os
import json
import base64
import logging
from openai import AzureOpenAI
from app.services.azure_ml import predict_hair_type as custom_vision_predict
from app.services.local_ml import predict_local_mobilenet

client = AzureOpenAI(
    api_key=os.getenv("AZURE_API_KEY"),
    api_version=os.getenv("AZURE_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_API_BASE")
)
DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")


def discriminator_agent(image_base64: str, cv_result: dict, mn_result: dict) -> str:
    """AGENT: Resolves conflicts between Custom Vision and MobileNetV3."""
    cv_pred = cv_result.get("hair_type", "Unknown")
    cv_conf = cv_result.get("confidence", 0.0)
    mn_pred = mn_result.get("hair_type", "Unknown")
    mn_conf = mn_result.get("confidence", 0.0)

    # If both models agree, skip the LLM call to save time and tokens
    if cv_pred.lower() == mn_pred.lower() and cv_pred != "Unknown":
        logging.info(f"[Kera AI Agent] CNN Consensus Reached instantly: {cv_pred}")
        return cv_pred

    logging.info(f"[Kera AI Agent] CNN Conflict Detected (CV: {cv_pred}, MobileNet: {mn_pred}). Consulting GPT-5 Discriminator...")

    # IMPORTANT: Prompt is intentionally plain and professional to avoid
    # Azure's content filter mis-flagging it as a jailbreak attempt.
    # Phrases like "Master Agent" and "Resolve the conflict" were triggering
    # the ResponsibleAIPolicyViolation / jailbreak detection. Keep this neutral.
    prompt = f"""You are a professional hair texture classification assistant.

Two automated image classifiers produced different results for the same photo:
- Classifier A predicted: {cv_pred} (confidence: {cv_conf:.0%})
- Classifier B predicted: {mn_pred} (confidence: {mn_conf:.0%})

Please examine the hair in the image carefully, paying attention to curl pattern,
strand structure, and density. Then determine which of these four categories is correct:
Straight, Wavy, Curly, or Coily.

Reply with one word only: the correct hair category."""

    try:
        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]}
            ],
            max_tokens=10,
            temperature=0.0
        )
        final_decision = response.choices[0].message.content.strip().capitalize()
        logging.info(f"[Kera AI Agent] Discriminator resolved conflict. Final Decision: {final_decision}")
        return final_decision
    except Exception as e:
        logging.error(f"[Kera AI Agent] Discriminator failed: {e}")
        # Tiebreaker: trust the model with the higher confidence
        return cv_pred if cv_conf >= mn_conf else mn_pred


def final_care_agent(final_hair_type: str, image_base64: str) -> dict:
    """AGENT: Generates the strict JSON care routine AND the exact hair subtype."""
    logging.info(f"[Kera AI Agent] Final Agent finding exact subtype for {final_hair_type}...")

    prompt = f"""You are a professional hair and scalp analyst.

A hair classification system has identified this person's general hair category as: {final_hair_type}
(one of: Straight, Wavy, Curly, or Coily).

Please look at the image and identify the exact Andre Walker hair subtype (e.g. 1A, 2B, 3C, 4A, 4B, 4C).
Also assess the hair's porosity, texture, curl pattern, and scalp health.

Return ONLY a valid JSON object with no markdown formatting, no explanation, and no extra text.

Use exactly this structure:
{{
  "hair_group": "{final_hair_type}",
  "exact_subtype": "4C",
  "porosity": "Low",
  "texture": "fine",
  "curl_pattern": "brief 1 sentence description",
  "scalp_score": 7,
  "scalp_condition": "Healthy",
  "care_recommendations": ["Tip 1", "Tip 2", "Tip 3"],
  "ingredients_to_avoid": ["ingredient1", "ingredient2"],
  "ingredients_to_seek": ["ingredient1", "ingredient2"]
}}

Field rules:
- exact_subtype must be a valid Andre Walker classification (1A through 4C)
- porosity must be exactly one of: "Low", "Medium", "High"
- texture must be exactly one of: "fine", "medium", "coarse"
- scalp_condition must be exactly one of: "Healthy", "Dry", "Oily", "Buildup", "Thinning"
- scalp_score must be an integer from 1 to 10"""

    try:
        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]}
            ],
            max_tokens=800,
            temperature=0.1
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if GPT accidentally adds them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        return json.loads(raw)
    except Exception as e:
        logging.error(f"[Kera AI Agent] Final Agent JSON generation failed: {e}")
        return {"error": str(e)}


def run_kera_ai_pipeline(image_bytes: bytes) -> dict:
    """MASTER ORCHESTRATOR: Executes the full multi-agent pipeline."""
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    # 1. Run both CNNs
    cv_result = custom_vision_predict(image_bytes)
    mn_result = predict_local_mobilenet(image_bytes)

    # 2. Resolve the final hair group
    final_group = discriminator_agent(image_base64, cv_result, mn_result)

    # 3. Generate the full JSON care profile + exact subtype
    final_profile = final_care_agent(final_group, image_base64)

    # 4. Attach debug metrics for the frontend dashboard
    final_profile["debug_metrics"] = {
        "custom_vision_pred": cv_result.get("hair_type"),
        "custom_vision_conf": cv_result.get("confidence"),
        "mobilenet_pred": mn_result.get("hair_type"),
        "mobilenet_conf": mn_result.get("confidence"),
        "discriminator_resolved": final_group
    }

    return final_profile