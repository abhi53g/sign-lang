import cv2
import numpy as np
import time
from tensorflow.keras.models import load_model

# === Load Model ===
MODEL_PATH = "asl_mobilenetv2.h5"  # path to your .h5 file
model = load_model(MODEL_PATH)

# === Label Map ===
label_map = {
    0:'A',1:'B',2:'C',3:'D',4:'E',5:'F',6:'G',7:'H',8:'I',9:'J',
    10:'K',11:'L',12:'M',13:'N',14:'O',15:'P',16:'Q',17:'R',18:'S',
    19:'T',20:'U',21:'V',22:'W',23:'X',24:'Y',25:'Z',26:'del',27:'nothing',28:'space'
}

# === Config ===
IMG_SIZE = (224, 224)
HOLD_TIME = 1.5  # seconds to hold before finalizing a letter

# === Initialize webcam ===
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Error: Could not open webcam.")
    exit()

print("✅ Webcam started. Press 'q' to quit.")

# === Initialize solution tracking ===
solution = ""
current_sign = None
sign_start_time = None
last_added_sign = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Failed to grab frame.")
        break

    # Flip horizontally for natural viewing
    frame = cv2.flip(frame, 1)

    # Define region of interest (ROI)
    x1, y1, x2, y2 = 100, 100, 324, 324
    roi = frame[y1:y2, x1:x2]

    # Preprocess ROI for model
    roi_resized = cv2.resize(roi, IMG_SIZE)
    roi_array = np.expand_dims(roi_resized.astype("float32") / 255.0, axis=0)

    # Predict
    preds = model.predict(roi_array, verbose=0)[0]
    pred_idx = np.argmax(preds)
    pred_label = label_map[pred_idx]
    confidence = preds[pred_idx]

    # === Finalize letter logic ===
    # Ignore 'nothing' predictions
    if pred_label != 'nothing' and confidence > 0.7:  # Only process high confidence predictions
        if current_sign == pred_label:
            # Same sign is being held
            elapsed_time = time.time() - sign_start_time
            
            # If held for HOLD_TIME and not already added, finalize it
            if elapsed_time >= HOLD_TIME and last_added_sign != pred_label:
                if pred_label == 'space':
                    solution += ' '
                    print(f"✅ Added: [SPACE]")
                elif pred_label == 'del':
                    if len(solution) > 0:
                        solution = solution[:-1]
                        print(f"✅ Deleted last character")
                else:
                    solution += pred_label
                    print(f"✅ Added: {pred_label}")
                
                last_added_sign = pred_label
        else:
            # New sign detected, reset timer
            current_sign = pred_label
            sign_start_time = time.time()
            last_added_sign = None
    else:
        # Reset if nothing detected
        current_sign = None
        sign_start_time = None
        last_added_sign = None

    # Calculate progress bar for hold time
    progress = 0
    if current_sign and sign_start_time:
        elapsed = time.time() - sign_start_time
        progress = min(elapsed / HOLD_TIME, 1.0)

    # Draw ROI rectangle
    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 0), 2)

    # Display prediction text
    cv2.putText(frame, f"{pred_label} ({confidence:.2f})", (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    # Display progress bar for hold time
    if progress > 0 and current_sign:
        bar_width = int(progress * (x2 - x1))
        cv2.rectangle(frame, (x1, y2 + 10), (x1 + bar_width, y2 + 30), (0, 255, 0), -1)
        cv2.rectangle(frame, (x1, y2 + 10), (x2, y2 + 30), (255, 255, 255), 2)
        cv2.putText(frame, f"Hold: {progress*100:.0f}%", (x1, y2 + 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Display solution text
    cv2.putText(frame, f"Text: {solution}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(frame, "Press 'q' to quit", (10, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

    # Show frame
    cv2.imshow("ASL Real-Time Prediction", frame)

    # Quit on 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
