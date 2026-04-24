import cv2
from ultralytics import YOLO
import os
import asyncio
import time
import csv
import torch
from status_manager import update_status

# ---------------------------------------------------------------------------
# Optional Hugging Face ZeroGPU support
# ---------------------------------------------------------------------------
try:
    import spaces
    HF_SPACES = True
except ImportError:
    HF_SPACES = False

# Detect the best available device once at startup
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"--- [CV Pipeline] Running on device: {DEVICE} ---")

# Vehicle classes in COCO dataset
VEHICLE_CLASSES = [2, 3, 5, 7] # car, motorcycle, bus, truck

OUTPUT_DIR = "output_videos"
REPORT_DIR = "reports"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def _run_cv_pipeline_impl(video_path: str):
    # Load model and move to the best available device
    model = YOLO("yolov8n.pt")
    model.to(DEVICE)
    print(f"--- [CV Pipeline] Model loaded on {DEVICE}. ---")
    
    start_time = time.time()
    print(f"--- [CV Pipeline] Starting tracking for: {video_path} ---")
    
    if not os.path.exists(video_path):
        print(f"--- [CV Pipeline] ERROR: File not found: {video_path} ---")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"--- [CV Pipeline] ERROR: Could not open video: {video_path} ---")
        return

    # Get video properties for writer
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps    = cap.get(cv2.CAP_PROP_FPS)
    
    # Define counting line (horizontal line at 70% of frame height)
    line_y = int(height * 0.7)
    
    # Initialize VideoWriter
    video_id = os.path.basename(video_path)
    output_path = os.path.join(OUTPUT_DIR, f"processed_{video_id}")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    counted_ids = set()
    total_vehicles_counted = 0
    type_breakdown = {}
    
    # Detailed data for CSV
    tracking_data = [] # List of [Frame, ID, Type]
    
    prev_y_positions = {}

    frame_count = 0
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        frame_count += 1
        
        # Run tracking
        results = model.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False)
        
        # Draw counting line
        cv2.line(frame, (0, line_y), (width, line_y), (0, 0, 255), 3)
        cv2.putText(frame, f"Counting Line", (10, line_y - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            ids = results[0].boxes.id.cpu().numpy().astype(int)
            classes = results[0].boxes.cls.cpu().numpy().astype(int)
            confidences = results[0].boxes.conf.cpu().numpy()

            for box, track_id, cls, conf in zip(boxes, ids, classes, confidences):
                if cls not in VEHICLE_CLASSES:
                    continue

                x1, y1, x2, y2 = box
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                label = model.names[cls]
                
                # Check for line crossing
                prev_y = prev_y_positions.get(track_id)
                if prev_y is not None:
                    if prev_y <= line_y and cy > line_y:
                        if track_id not in counted_ids:
                            counted_ids.add(track_id)
                            total_vehicles_counted += 1
                            type_breakdown[label] = type_breakdown.get(label, 0) + 1
                            
                            # Log for CSV
                            tracking_data.append([frame_count, track_id, label])
                            
                            print(f"[Count] Vehicle {track_id} ({label}) crossed the line! Total: {total_vehicles_counted}")
                
                prev_y_positions[track_id] = cy

                # Visualization
                color = (0, 255, 0) # Green for detected
                if track_id in counted_ids:
                    color = (222, 59, 54) # brand-red (BGR: 54, 59, 222)
                
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                cv2.putText(frame, f"ID:{track_id} {label}", (int(x1), int(y1) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Draw total count on frame
        cv2.putText(frame, f"Total Vehicles: {total_vehicles_counted}", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)

        out.write(frame)

        # No-op to allow other threads to breathe (optional)
        if frame_count % 30 == 0:
            pass

    cap.release()
    out.release()
    
    end_time = time.time()
    duration = round(end_time - start_time, 2)

    # Generate CSV Report
    report_filename = f"report_{video_id}.csv"
    report_path = os.path.join(REPORT_DIR, report_filename)
    
    with open(report_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        # Summary Header
        writer.writerow(["# SMART DRONE TRAFFIC ANALYZER REPORT"])
        writer.writerow(["Total Vehicles Counted", total_vehicles_counted])
        writer.writerow(["Processing Duration (sec)", duration])
        
        breakdown_str = ", ".join([f"{k}: {v}" for k, v in type_breakdown.items()])
        writer.writerow(["Type Breakdown", breakdown_str])
        writer.writerow([])
        
        # Detailed Tracking Data
        writer.writerow(["Frame Number", "Vehicle ID", "Vehicle Type"])
        writer.writerows(tracking_data)

    # Convert NumPy types to standard Python types for JSON serialization
    clean_type_breakdown = {str(k): int(v) for k, v in type_breakdown.items()}
    
    # Update status to completed with results
    results_data = {
        "total_count": int(total_vehicles_counted),
        "type_breakdown": clean_type_breakdown,
        "duration": float(duration),
        "recent_detections": [[int(x) if isinstance(x, (int, float)) else str(x) for x in row] for row in tracking_data[-10:]]
    }
    update_status(video_id, "completed", results_data)
    
    print(f"--- [CV Pipeline] Finished. Report saved: {report_path} ---")


# ---------------------------------------------------------------------------
# Public entry point — wrap with @spaces.GPU only on Hugging Face
# ---------------------------------------------------------------------------
if HF_SPACES:
    @spaces.GPU(duration=120)
    def run_cv_pipeline(video_path: str):
        """GPU-accelerated entry point for Hugging Face ZeroGPU spaces."""
        _run_cv_pipeline_impl(video_path)
else:
    def run_cv_pipeline(video_path: str):
        """CPU entry point for local / non-HF environments."""
        _run_cv_pipeline_impl(video_path)
