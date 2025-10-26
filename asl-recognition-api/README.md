# ASL Recognition API

REST API for American Sign Language (ASL) recognition using MobileNetV2 deep learning model.

## Features

- Real-time ASL sign recognition (A-Z + special characters)
- REST API endpoints for image-based predictions
- Batch processing support
- CORS enabled for frontend integration

## Model Details

- **Architecture**: MobileNetV2
- **Input Size**: 224x224 RGB images
- **Classes**: 29 labels
  - Letters: A-Z
  - Special: `space`, `del` (delete), `nothing`
- **Framework**: TensorFlow/Keras

## Setup

### 1. Create Virtual Environment

```bash
cd asl-recognition-api
python -m venv asl_env
```

### 2. Activate Environment

**Windows**:
```powershell
.\asl_env\Scripts\Activate.ps1
```

**Linux/Mac**:
```bash
source asl_env/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the API Server

```bash
python app.py
```

The server will start at `http://localhost:5000`

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### Single Prediction
```http
POST /api/predict
Content-Type: application/json

{
  "image": "base64_encoded_image_string"
}
```

Response:
```json
{
  "success": true,
  "prediction": "A",
  "confidence": 0.95,
  "top_predictions": {
    "A": 0.95,
    "B": 0.03,
    ...
  }
}
```

### Batch Prediction
```http
POST /api/predict-batch
Content-Type: application/json

{
  "images": ["base64_1", "base64_2", ...]
}
```

### Get All Labels
```http
GET /api/labels
```

Response:
```json
{
  "success": true,
  "labels": ["A", "B", "C", ..., "space", "del", "nothing"]
}
```

## Integration with Frontend

The frontend (React app at `gesture-bridge-hub`) connects to this API for real-time ASL recognition.

### Example Frontend Code

```typescript
// Capture frame from webcam
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0);

// Convert to base64
const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

// Send to API
const response = await fetch('http://localhost:5000/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64Image })
});

const data = await response.json();
console.log('Predicted sign:', data.prediction);
```

## Files

- `app.py` - Flask API server
- `asl_mobilenetv2.h5` - Trained model weights
- `inf.py` - Original inference script with webcam (standalone)
- `requirements.txt` - Python dependencies
- `asl_env/` - Virtual environment (not in git)

## Development

### Run in Development Mode

```bash
python app.py
```

### Run Standalone Webcam Script

```bash
python inf.py
```

## Notes

- Default port: 5000
- CORS is enabled for all origins (configure in production)
- Model predictions require confidence > 0.7 for reliable results
- Images are automatically resized to 224x224
