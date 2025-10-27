"""
ASL Recognition API
Provides REST endpoints for ASL sign language recognition using MobileNetV2 model

Extended backend features:
- JWT authentication (signup/login/me)
- User management (list, update status/role)
- Prediction logging with latency
- Dashboard stats summary
- Prediction logs querying with filters
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import numpy as np
import cv2
import base64
from tensorflow.keras.models import load_model
import logging
import os
import time
from datetime import datetime

from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    verify_jwt_in_request,
)

from passlib.hash import bcrypt

from models import db, User, PredictionLog, get_summary_stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# App/DB/Auth configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///asl.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")

db.init_app(app)
jwt = JWTManager(app)

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


def hash_password(plain: str) -> str:
    return bcrypt.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.verify(plain, hashed)
    except Exception:
        return False


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


@app.before_request
def update_last_activity_if_authenticated():
    """If a valid JWT is present, update user's last activity timestamp."""
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            user = db.session.get(User, uid)
            if user:
                user.last_activity_at = datetime.utcnow()
                db.session.commit()
                g.current_user = user
    except Exception:
        # No valid JWT or other issue; ignore
        pass


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    }), 200


# -----------------------
# Auth & User Management
# -----------------------

@app.post('/api/auth/signup')
def signup():
    """Register a new user. First user becomes admin by default."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    # Check if exists
    if db.session.query(User).filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 409

    role = 'user'
    # First user becomes admin
    if db.session.query(User).count() == 0:
        role = 'admin'

    user = User(
        email=email,
        password_hash=hash_password(password),
        role=role,
        active=True,
        blocked=False,
        last_activity_at=datetime.utcnow(),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'success': True, 'user': user.to_dict()}), 201


@app.post('/api/auth/login')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    user = db.session.query(User).filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    if not user.active or user.blocked:
        return jsonify({'success': False, 'error': 'Account inactive or blocked'}), 403

    user.last_activity_at = datetime.utcnow()
    db.session.commit()

    token = create_access_token(identity=user.id, additional_claims={'role': user.role})
    return jsonify({'success': True, 'access_token': token, 'user': user.to_dict()}), 200


@app.get('/api/auth/me')
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user.to_dict()}), 200


def require_admin() -> tuple[bool, tuple]:
    """Helper to check admin role within a protected route."""
    claims = get_jwt()
    role = claims.get('role')
    if role != 'admin':
        return False, (jsonify({'success': False, 'error': 'Admin access required'}), 403)
    return True, ()


@app.get('/api/users')
@jwt_required()
def list_users():
    ok, resp = require_admin()
    if not ok:
        return resp
    users = db.session.query(User).order_by(User.created_at.desc()).all()
    return jsonify({'success': True, 'users': [u.to_dict() for u in users]}), 200


@app.patch('/api/users/<int:user_id>')
@jwt_required()
def update_user(user_id: int):
    ok, resp = require_admin()
    if not ok:
        return resp
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    data = request.get_json() or {}
    if 'active' in data:
        user.active = bool(data['active'])
    if 'blocked' in data:
        user.blocked = bool(data['blocked'])
    if 'role' in data:
        user.role = str(data['role'])
    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()}), 200


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
        start_t = time.perf_counter()

        # Attach JWT user if present (optional)
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()

        # Get image from request
        data = request.get_json() or {}
        if 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400

        # Preprocess image
        img_array = preprocess_image(data['image'])
        if img_array is None:
            return jsonify({'success': False, 'error': 'Failed to preprocess image'}), 400

        # Make prediction
        predictions = model.predict(img_array, verbose=0)[0]

        # Get top prediction
        pred_idx = np.argmax(predictions)
        pred_label = LABEL_MAP[pred_idx]
        confidence = float(predictions[pred_idx])

        # Get top 5 predictions
        top_5_indices = np.argsort(predictions)[-5:][::-1]
        top_5_predictions = {LABEL_MAP[idx]: float(predictions[idx]) for idx in top_5_indices}

        logger.info(f"Prediction: {pred_label} (confidence: {confidence:.2f})")

        latency_ms = (time.perf_counter() - start_t) * 1000.0

        # Log prediction
        try:
            log = PredictionLog(
                user_id=current_user_id,
                timestamp=datetime.utcnow(),
                label=pred_label,
                confidence=confidence,
                latency_ms=latency_ms,
                success=True,
                error_message=None,
                client_ip=request.headers.get('X-Forwarded-For', request.remote_addr),
                top_predictions=top_5_predictions,
            )
            db.session.add(log)
            # Update user last activity if logged in
            if current_user_id:
                u = db.session.get(User, current_user_id)
                if u:
                    u.last_activity_at = datetime.utcnow()
            db.session.commit()
        except Exception as log_err:
            logger.error(f"Failed to log prediction: {log_err}")

        return jsonify({
            'success': True,
            'prediction': pred_label,
            'confidence': confidence,
            'top_predictions': top_5_predictions,
            'latency_ms': latency_ms
        }), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Attempt to log failure
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except Exception:
            current_user_id = None
        try:
            log = PredictionLog(
                user_id=current_user_id,
                timestamp=datetime.utcnow(),
                label=None,
                confidence=None,
                latency_ms=None,
                success=False,
                error_message=str(e),
                client_ip=request.headers.get('X-Forwarded-For', request.remote_addr),
                top_predictions=None,
            )
            db.session.add(log)
            db.session.commit()
        except Exception:
            pass
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
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
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
                start_t = time.perf_counter()
                predictions = model.predict(img_array, verbose=0)[0]
                latency_ms = (time.perf_counter() - start_t) * 1000.0
                pred_idx = np.argmax(predictions)
                pred_label = LABEL_MAP[pred_idx]
                conf = float(predictions[pred_idx])
                results.append({
                    'prediction': pred_label,
                    'confidence': conf
                })
                # Log
                try:
                    db.session.add(PredictionLog(
                        user_id=current_user_id,
                        timestamp=datetime.utcnow(),
                        label=pred_label,
                        confidence=conf,
                        latency_ms=latency_ms,
                        success=True,
                        error_message=None,
                        client_ip=request.headers.get('X-Forwarded-For', request.remote_addr),
                        top_predictions=None,
                    ))
                except Exception as log_err:
                    logger.error(f"Failed to log batch prediction: {log_err}")
            else:
                results.append({
                    'prediction': None,
                    'confidence': 0.0,
                    'error': 'Failed to preprocess'
                })
        # Commit logs once
        try:
            if results:
                db.session.commit()
        except Exception:
            db.session.rollback()

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


@app.get('/api/stats/summary')
@jwt_required()
def stats_summary():
    ok, resp = require_admin()
    if not ok:
        return resp
    return jsonify({'success': True, 'stats': get_summary_stats()}), 200


@app.get('/api/predictions')
@jwt_required()
def list_predictions():
    """List prediction logs with filters. Admin: all; User: own only.
    Query params:
      - start (ISO8601), end (ISO8601)
      - user_id, email
      - label
      - min_confidence, max_confidence
      - success (true/false)
      - page (default 1), page_size (default 25)
    """
    claims = get_jwt()
    role = claims.get('role')
    uid = get_jwt_identity()

    q = db.session.query(PredictionLog)

    # Filters
    args = request.args
    start = args.get('start')
    end = args.get('end')
    user_id = args.get('user_id')
    email = args.get('email')
    label = args.get('label')
    min_conf = args.get('min_confidence')
    max_conf = args.get('max_confidence')
    success = args.get('success')

    # Restrict by role
    if role != 'admin':
        q = q.filter(PredictionLog.user_id == uid)
    else:
        if user_id:
            try:
                q = q.filter(PredictionLog.user_id == int(user_id))
            except ValueError:
                pass
        if email:
            u = db.session.query(User).filter(User.email == email.lower()).first()
            if u:
                q = q.filter(PredictionLog.user_id == u.id)
            else:
                q = q.filter(PredictionLog.user_id == -1)  # no results

    if label:
        q = q.filter(PredictionLog.label == label)
    if min_conf:
        try:
            q = q.filter(PredictionLog.confidence >= float(min_conf))
        except ValueError:
            pass
    if max_conf:
        try:
            q = q.filter(PredictionLog.confidence <= float(max_conf))
        except ValueError:
            pass
    if success is not None:
        if success.lower() in ('true', '1'):
            q = q.filter(PredictionLog.success.is_(True))
        elif success.lower() in ('false', '0'):
            q = q.filter(PredictionLog.success.is_(False))

    # Date range
    def parse_iso(dt_str: str):
        try:
            return datetime.fromisoformat(dt_str)
        except Exception:
            return None

    if start:
        sdt = parse_iso(start)
        if sdt:
            q = q.filter(PredictionLog.timestamp >= sdt)
    if end:
        edt = parse_iso(end)
        if edt:
            q = q.filter(PredictionLog.timestamp <= edt)

    # Pagination
    try:
        page = max(int(args.get('page', 1)), 1)
    except ValueError:
        page = 1
    try:
        page_size = min(max(int(args.get('page_size', 25)), 1), 200)
    except ValueError:
        page_size = 25
    total = q.count()
    items = (
        q.order_by(PredictionLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'page_size': page_size,
        'items': [i.to_dict() for i in items]
    }), 200


if __name__ == '__main__':
    print("🚀 Starting ASL Recognition API Server...")
    print("📡 Server will be available at http://localhost:5000")
    print("🔗 Frontend can connect to: http://localhost:5000/api/predict")
    # Initialize database tables
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
