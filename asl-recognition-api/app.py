"""
ASL Recognition API
Provides REST endpoints for ASL sign language recognition using MobileNetV2 model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
from tensorflow.keras.models import load_model
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Model configuration
MODEL_PATH = "asl_mobilenetv2.h5"
IMG_SIZE = (224, 224)

# Label mapping
LABEL_MAP = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S',
    19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: 'del', 
    27: 'nothing', 28: 'space'
}

# Load model at startup
logger.info("Loading ASL recognition model...")
try:
    model = load_model(MODEL_PATH)
    logger.info("✅ Model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    model = None


def preprocess_image(image_data):
    """
    Preprocess image for model prediction
    
    Args:
        image_data: Base64 encoded image string or numpy array
        
    Returns:
        Preprocessed numpy array ready for model input
    """
    try:
        # If base64 string, decode it
        if isinstance(image_data, str):
            # Remove data:image/jpeg;base64, prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Decode base64
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = image_data
        
        # Resize to model input size
        img_resized = cv2.resize(img, IMG_SIZE)
        
        # Normalize pixel values to [0, 1]
        img_normalized = img_resized.astype("float32") / 255.0
        
        # Add batch dimension
        img_batch = np.expand_dims(img_normalized, axis=0)
        
        return img_batch
    except Exception as e:
        logger.error(f"Error in preprocessing: {e}")
        return None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    }), 200


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Predict ASL sign from image
    
    Request body:
        {
            "image": "base64_encoded_image_string"
        }
        
    Response:
        {
            "success": true,
            "prediction": "A",
            "confidence": 0.95,
            "all_predictions": {...}
        }
    """
    if model is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded'
        }), 500
    
    try:
        # Get image from request
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400
        
        # Preprocess image
        img_array = preprocess_image(data['image'])
        
        if img_array is None:
            return jsonify({
                'success': False,
                'error': 'Failed to preprocess image'
            }), 400
        
        # Make prediction
        predictions = model.predict(img_array, verbose=0)[0]
        
        # Get top prediction
        pred_idx = np.argmax(predictions)
        pred_label = LABEL_MAP[pred_idx]
        confidence = float(predictions[pred_idx])
        
        # Get top 5 predictions
        top_5_indices = np.argsort(predictions)[-5:][::-1]
        top_5_predictions = {
            LABEL_MAP[idx]: float(predictions[idx])
            for idx in top_5_indices
        }
        
        logger.info(f"Prediction: {pred_label} (confidence: {confidence:.2f})")
        
        return jsonify({
            'success': True,
            'prediction': pred_label,
            'confidence': confidence,
            'top_predictions': top_5_predictions
        }), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/predict-batch', methods=['POST'])
def predict_batch():
    """
    Predict ASL signs from multiple images
    
    Request body:
        {
            "images": ["base64_1", "base64_2", ...]
        }
    """
    if model is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded'
        }), 500
    
    try:
        data = request.get_json()
        
        if 'images' not in data:
            return jsonify({
                'success': False,
                'error': 'No images provided'
            }), 400
        
        results = []
        for img_data in data['images']:
            img_array = preprocess_image(img_data)
            if img_array is not None:
                predictions = model.predict(img_array, verbose=0)[0]
                pred_idx = np.argmax(predictions)
                results.append({
                    'prediction': LABEL_MAP[pred_idx],
                    'confidence': float(predictions[pred_idx])
                })
            else:
                results.append({
                    'prediction': None,
                    'confidence': 0.0,
                    'error': 'Failed to preprocess'
                })
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/labels', methods=['GET'])
def get_labels():
    """Get all available ASL labels"""
    return jsonify({
        'success': True,
        'labels': list(LABEL_MAP.values())
    }), 200


if __name__ == '__main__':
    print("🚀 Starting ASL Recognition API Server...")
    print("📡 Server will be available at http://localhost:5000")
    print("🔗 Frontend can connect to: http://localhost:5000/api/predict")
    app.run(host='0.0.0.0', port=5000, debug=True)
