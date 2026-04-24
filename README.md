---
title: Smart Drone Traffic Analyzer
emoji: 🛸
colorFrom: purple
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---


# 🛸 Smart Drone Traffic Analyzer

A professional, decoupled web application designed to analyze road traffic from drone-perspective footage. Leveraging **YOLOv8** for real-time object detection and **ByteTrack** for persistent object tracking, this system provides accurate vehicle counts and detailed traffic flow reports.

## 🚀 Features

- **Asynchronous Processing**: Background task management ensures the UI remains responsive during heavy CV computations.
- **Precision Tracking**: Uses ByteTrack to maintain unique vehicle IDs, preventing double-counting during occlusions.
- **Real-time Visualization**: Processed videos include bounding boxes, tracking IDs, and a virtual counting line.
- **Comprehensive Reporting**: Generates downloadable CSV reports with vehicle type breakdowns and processing metrics.
- **Premium UI**: Modern dark-mode dashboard built with Next.js and Tailwind CSS v4.

## 🛠️ Architecture

The project follows a decoupled architecture for maximum scalability:

1.  **Backend (FastAPI)**:
    *   Handles secure file uploads with sanitization.
    *   Manages a CV pipeline using `ultralytics` (YOLOv8).
    *   Exposes status and resource endpoints for the frontend.
2.  **Frontend (Next.js)**:
    *   React-based SPA with polling logic to track processing status.
    *   Responsive dashboard with video playback and data export capabilities.

## 🚦 Setup Instructions

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **FFmpeg**: Required for video re-encoding (H.264).
    *   *Windows*: `winget install ffmpeg`
    *   *Linux*: `sudo apt install ffmpeg`
    *   *macOS*: `brew install ffmpeg`

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
The backend will start at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## 🧠 Tracking Methodology

### Object Detection & Persistence
We utilize **YOLOv8 (yolov8n.pt)** for fast and accurate vehicle detection (cars, trucks, buses, motorcycles). To solve the "memory" problem where a vehicle might be lost behind a tree or sign, we integrate **ByteTrack**. This assigns a unique `track_id` to every object that persists across frames.

### Performance Optimizations
- **High-Precision Model**: Upgraded to **YOLOv8m** (Medium). While slightly heavier, it provides significantly better feature extraction for identifying large, complex vehicles like **trains** and **heavy trucks** which the smaller models often confuse for buses or cars.
- **Inference Scaling**: Inference is performed at **960px** with a **0.15 confidence threshold**. This aggressive configuration ensures the system can "see" vehicles in the far distance that are only a few pixels wide.
- **Asynchronous Re-encoding**: The system processes video in `mp4v` for speed, then performs a high-efficiency **H.264 pass with ffmpeg** using `+faststart` to ensure the final output is streamable in all modern browsers.

### The Dual-Line Box-Intersection Logic
To ensure 100% accurate counting even for oversized vehicles:
1.  **Box-Line Intersection**: Instead of checking just the "center point" (which can be unreliable for very long objects like trains), the system now checks if **any edge** (Top, Bottom, Left, Right) of the vehicle's bounding box crosses our tripwires.
2.  **Horizontal Main Line (70% Height)**: Monitors vertical traffic flow (Up/Down).
3.  **Vertical Side Line (50% Width)**: Monitors horizontal traffic flow (Left/Right).
3.  **Bi-directional Tracking**: The algorithm detects line-crossing events in **both directions** for both lines.
4.  **Deduplication**: Uses a unique `track_id` registry to ensure a vehicle crossing multiple lines is only counted once for the entire session. This robustly handles vehicles turning at intersections or passing through corners of the frame.

## 🏗️ Project Structure
```
├── backend/
│   ├── cv_pipeline.py    # Core YOLO + ByteTrack logic
│   ├── main.py           # FastAPI endpoints & streaming
│   ├── status_manager.py # Thread-safe progress tracking
│   └── requirements.txt
├── frontend/
│   ├── src/app/page.tsx  # Main Next.js dashboard
│   └── ...
└── packages.txt          # System dependencies for HF Spaces
```

## 📝 Assumptions & Constraints
- **Camera Stability**: The system assumes the drone camera remains relatively stationary or stabilized. A static counting line relies on a fixed frame of reference.
- **Video Format**: Currently strictly optimized for `.mp4` files to ensure browser compatibility.
- **Model Limitations (Top-Down View)**: Standard YOLOv8 is trained on the COCO dataset (mostly eye-level). In drone footage, long rectangular objects like **trains** can occasionally be misclassified as **buses**. In a production environment, this would be solved by fine-tuning the model on an aerial-specific dataset (like VisDrone).
- **Environment**: Performance varies based on CPU/GPU availability; the system uses `yolov8n` (nano) by default for compatibility with standard hardware.

---
Built with ❤️ for Smart City Infrastructure.
