# app/services/local_ml.py
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import os
import logging

# Define the 4 classes our model was trained on
CLASS_NAMES =["Straight", "Wavy", "Curly", "Coily"]
DEVICE = torch.device("cpu") # Run on CPU for Flask to save memory

# Load the model exactly as we defined it in Colab
model = models.mobilenet_v3_large(weights=None)
num_features = model.classifier[3].in_features
model.classifier[3] = nn.Sequential(
    nn.Dropout(0.4),
    nn.Linear(num_features, 4)
)

# Load the weights from the file
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "hair_model_4class.pth")

try:
    checkpoint = torch.load(model_path, map_location=DEVICE)
    model.load_state_dict(checkpoint)
    model = model.to(DEVICE)
    model.eval()
    logging.info("[Kera AI] ✅ Local MobileNetV3 Model Loaded Successfully!")
except Exception as e:
    logging.error(f"[Kera AI] ❌ Failed to load MobileNetV3: {e}. Ensure hair_model_4class.pth is in app/services/")

# Exact same preprocessing used in training
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],[0.229, 0.224, 0.225])
])

def predict_local_mobilenet(image_bytes: bytes) -> dict:
    """Run an image through our trained PyTorch model."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_tensor = preprocess(image).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            output = model(img_tensor)
            probs = torch.softmax(output, dim=1)[0]
            pred_idx = torch.argmax(probs).item()
            
        confidence = probs[pred_idx].item()
        predicted_class = CLASS_NAMES[pred_idx]
        
        logging.info(f"[Kera AI] MobileNetV3 Prediction: {predicted_class} ({confidence*100:.1f}%)")
        return {"hair_type": predicted_class, "confidence": round(confidence, 3)}
        
    except Exception as e:
        logging.error(f"[Kera AI] Local PyTorch prediction failed: {e}")
        return {"error": str(e), "hair_type": "Unknown", "confidence": 0.0}