import cv2
import os
import time
import csv
import torch
import subprocess
from ultralytics import YOLO
from status_manager import update_status

# ---------------------------------------------------------------------------
# Optional Hugging Face ZeroGPU support
# ---------------------------------------------------------------------------
try:
    import spaces  # type: ignore  # only available inside HF Spaces
    HF_SPACES = True
except ImportError:
    HF_SPACES = False

# Detect the best available device once at startup
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

class TrafficAnalyzer:
    def __init__(self, model_path="yolov8n.pt"):
        self.model = YOLO(model_path)
        self.model.to(DEVICE)
        self.vehicle_classes = [2, 3, 5, 6, 7] # car, motorcycle, bus, train, truck
        
        self.output_dir = "output_videos"
        self.report_dir = "reports"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.report_dir, exist_ok=True)

    def _get_video_props(self, cap):
        return {
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        }

    def _reencode_h264(self, video_path):
        """Re-encodes video to browser-compatible H.264 using ffmpeg."""
        h264_path = video_path.replace(".mp4", "_h264.mp4")
        try:
            # Attempt to use static-ffmpeg if installed
            try:
                import static_ffmpeg
                static_ffmpeg.add_paths()
            except ImportError:
                pass

            cmd = [
                "ffmpeg", "-y", "-i", video_path,
                "-c:v", "libx264", "-preset", "fast", "-crf", "20",
                "-movflags", "+faststart", h264_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                os.replace(h264_path, video_path)
                print(f"--- [TrafficAnalyzer] H.264 Re-encoding successful: {video_path} ---")
            else:
                print(f"--- [TrafficAnalyzer] ffmpeg failed: {result.stderr[-200:]} ---")
        except Exception as e:
            print(f"--- [TrafficAnalyzer] Re-encoding error: {e} ---")

    def _generate_report(self, video_id, data, stats):
        """Generates a detailed CSV report."""
        report_path = os.path.join(self.report_dir, f"report_{video_id}.csv")
        with open(report_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["# SMART DRONE TRAFFIC ANALYZER REPORT"])
            writer.writerow(["Total Vehicles Counted", stats['total']])
            writer.writerow(["Processing Duration (sec)", stats['duration']])
            writer.writerow(["Type Breakdown", ", ".join([f"{k}: {v}" for k, v in stats['breakdown'].items()])])
            writer.writerow([])
            writer.writerow(["Frame Number", "Timestamp (sec)", "Vehicle ID", "Vehicle Type"])
            writer.writerows(data)
        return report_path

    def process_video(self, video_path):
        video_id = os.path.basename(video_path)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return print(f"--- [Error] Could not open {video_path} ---")

        props = self._get_video_props(cap)
        line_y = int(props['height'] * 0.7)
        
        output_path = os.path.join(self.output_dir, f"processed_{video_id}")
        out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), props['fps'], (props['width'], props['height']))

        # Tracking State
        counted_ids = set()
        prev_y_positions = {}
        type_breakdown = {}
        tracking_data = [] # [frame, timestamp, id, type]
        start_time = time.time()
        frame_count = 0

        print(f"--- [TrafficAnalyzer] Starting Analysis: {video_id} ---")

        while cap.isOpened():
            success, frame = cap.read()
            if not success: break
            frame_count += 1

            # 1. Inference (imgsz=800 for better distant detection)
            results = self.model.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False, imgsz=800, conf=0.20)
            
            # 2. Logic & Visualization
            cv2.line(frame, (0, line_y), (props['width'], line_y), (0, 0, 255), 3)
            cv2.putText(frame, "Counting Line", (10, line_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            if results[0].boxes.id is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                ids = results[0].boxes.id.cpu().numpy().astype(int)
                classes = results[0].boxes.cls.cpu().numpy().astype(int)

                for box, track_id, cls in zip(boxes, ids, classes):
                    if cls not in self.vehicle_classes: continue
                    
                    x1, y1, x2, y2 = box
                    cy = int((y1 + y2) / 2)
                    label = self.model.names[cls]
                    
                    # Tripwire Logic
                    prev_y = prev_y_positions.get(track_id)
                    if prev_y is not None and prev_y <= line_y and cy > line_y:
                        if track_id not in counted_ids:
                            counted_ids.add(track_id)
                            type_breakdown[label] = type_breakdown.get(label, 0) + 1
                            tracking_data.append([frame_count, round(frame_count/props['fps'], 2), track_id, label])

                    prev_y_positions[track_id] = cy

                    # Drawing
                    color = (222, 59, 54) if track_id in counted_ids else (0, 255, 0)
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                    cv2.putText(frame, f"ID:{track_id} {label}", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            cv2.putText(frame, f"Total Vehicles: {len(counted_ids)}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
            out.write(frame)

            if frame_count % 10 == 0:
                progress = int((frame_count / props['total_frames']) * 100) if props['total_frames'] > 0 else 0
                update_status(video_id, "processing", progress=progress)

        cap.release()
        out.release()

        # 3. Finalization
        duration = round(time.time() - start_time, 2)
        self._generate_report(video_id, tracking_data, {
            'total': len(counted_ids),
            'duration': duration,
            'breakdown': type_breakdown
        })
        self._reencode_h264(output_path)

        # 4. Status Update
        clean_breakdown = {str(k): int(v) for k, v in type_breakdown.items()}
        results_data = {
            "total_count": len(counted_ids),
            "type_breakdown": clean_breakdown,
            "duration": duration,
            "full_tracking_history": [[int(x) if isinstance(x, (int, float)) else str(x) for x in row] for row in tracking_data]
        }
        update_status(video_id, "completed", results_data, progress=100)

# ---------------------------------------------------------------------------
# Global Singleton Instance & Entry Points
# ---------------------------------------------------------------------------
_analyzer = TrafficAnalyzer()

if HF_SPACES:
    @spaces.GPU(duration=120)
    def run_cv_pipeline(video_path: str):
        _analyzer.process_video(video_path)
else:
    def run_cv_pipeline(video_path: str):
        _analyzer.process_video(video_path)
