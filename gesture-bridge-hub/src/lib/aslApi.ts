/**
 * ASL Recognition API Service
 * Handles communication with the Python backend for sign language recognition
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface PredictionResponse {
  success: boolean;
  prediction?: string;
  confidence?: number;
  top_predictions?: Record<string, number>;
  error?: string;
}

export interface BatchPredictionResponse {
  success: boolean;
  results?: Array<{
    prediction: string | null;
    confidence: number;
    error?: string;
  }>;
  error?: string;
}

export interface LabelsResponse {
  success: boolean;
  labels?: string[];
  error?: string;
}

/**
 * Check if the API server is healthy and model is loaded
 */
export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('API health check failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

/**
 * Predict ASL sign from a base64 encoded image
 * @param imageBase64 - Base64 encoded image string (with or without data:image prefix)
 */
export async function predictSign(imageBase64: string): Promise<PredictionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Prediction failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Prediction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Predict ASL signs from multiple images
 * @param imagesBase64 - Array of base64 encoded image strings
 */
export async function predictBatch(imagesBase64: string[]): Promise<BatchPredictionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: imagesBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Batch prediction failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Batch prediction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all available ASL labels
 */
export async function getLabels(): Promise<LabelsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/labels`);

    if (!response.ok) {
      throw new Error('Failed to fetch labels');
    }

    return await response.json();
  } catch (error) {
    console.error('Get labels error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert a video frame (HTMLVideoElement or canvas) to base64
 * @param source - Video element or canvas
 * @param x - X coordinate for cropping (optional)
 * @param y - Y coordinate for cropping (optional)
 * @param width - Width for cropping (optional)
 * @param height - Height for cropping (optional)
 */
export function videoFrameToBase64(
  source: HTMLVideoElement | HTMLCanvasElement,
  x = 0,
  y = 0,
  width?: number,
  height?: number,
  options?: { mirror?: boolean; format?: 'jpeg' | 'png'; quality?: number }
): string {
  const canvas = document.createElement('canvas');
  const sourceWidth = 'videoWidth' in source ? source.videoWidth : source.width;
  const sourceHeight = 'videoHeight' in source ? source.videoHeight : source.height;

  canvas.width = width || sourceWidth;
  canvas.height = height || sourceHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const mirror = options?.mirror ?? false;
  if (mirror) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  if ('videoWidth' in source) {
    // It's a video element
    ctx.drawImage(source, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  } else {
    // It's already a canvas
    ctx.drawImage(source, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  }

  if (mirror) {
    ctx.restore();
  }

  // Return base64 without the data:image prefix (API expects clean base64)
  const format = options?.format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = options?.quality ?? 0.95;
  return canvas.toDataURL(format, quality).split(',')[1];
}
