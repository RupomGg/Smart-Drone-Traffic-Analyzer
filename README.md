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
- Python 3.9+
- Node.js 18+
- npm or yarn

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

### The Virtual Counting Line
To calculate traffic volume:
1.  A virtual horizontal line is drawn at 70% of the frame height.
2.  The system calculates the center point of every tracked bounding box.
3.  A "Crossing Event" is triggered only when a vehicle's center moves from above the line to below the line.
4.  Once a `track_id` triggers a crossing, it is added to a `counted_ids` set to prevent it from being counted again in subsequent frames.

## 📝 Assumptions & Constraints
- **Camera Stability**: The system assumes the drone camera remains relatively stationary or stabilized. A static counting line relies on a fixed frame of reference.
- **Video Format**: Currently strictly optimized for `.mp4` files to ensure browser compatibility.
- **Environment**: Performance varies based on CPU/GPU availability; the system uses `yolov8n` (nano) by default for compatibility with standard hardware.

---
Built with ❤️ for Smart City Infrastructure.
