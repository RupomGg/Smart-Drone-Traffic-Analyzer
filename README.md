---
title: Smart Drone Traffic Analyzer
emoji: 🛸
colorFrom: purple
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# 🛸 Smart Drone Traffic Analyzer (Neural Engine v11)

A professional-grade, full-stack AI application designed to transform raw drone footage into high-fidelity traffic analytics. This system utilizes a decoupled architecture, combining a **FastAPI** backend (accelerated by **A100 GPUs**) with a **Next.js** frontend for real-time telemetry and data visualization.

![Banner](/artifacts/media__1777134904575.png)

## 🚀 Key Features

- **State-of-the-Art Detection**: Powered by **YOLO11m** (Medium), optimized for small object detection in aerial footage.
- **MOT Persistence**: Implements the **ByteTrack** algorithm to maintain unique vehicle IDs across frames, even through occlusions.
- **Real-Time Telemetry Stream**: A bespoke, Mac-style terminal interface that broadcasts live backend events (GPU status, tracker initialization, and detection triggers).
- **Bento Dashboard UX**: A high-density, single-page results view providing temporal intensity charts, classification breakdowns, and granular event logs.
- **Dual-Line Tripwire Logic**: Robust counting system that uses bounding-box intersection (not just center points) to accurately track oversized vehicles like buses and trains.
- **Hybrid Cloud Architecture**: Backend hosted on **Hugging Face ZeroGPU** (Docker) for specialized AI compute, with the frontend on **Vercel** for low-latency delivery.

## 🛠️ Architecture Breakdown

### 1. Backend (FastAPI + AI Engine)
*   **Asynchronous Pipeline**: Processing is decoupled from the request cycle using Python `BackgroundTasks`.
*   **Status Management**: A thread-safe global manager tracks progress, results, and a live log buffer.
*   **Video Engineering**: Integrated **FFmpeg** re-encoding pass (`libx264`) ensures all processed AI videos are streamable in modern browsers.
*   **Hugging Face Integration**: Optimized for **ZeroGPU** using the `@spaces.GPU` decorator to access high-performance NVIDIA hardware on-demand.

### 2. Frontend (Next.js + Modular React)
*   **Modular Component Architecture**: Refactored for maintainability using specialized components (`Terminal.tsx`, `Dashboard.tsx`, `Hero.tsx`).
*   **Dynamic Polling**: Efficiently consumes backend status updates to drive the live progress bar, timer, and terminal stream.
*   **Data Visualization**: Uses **Recharts** to generate temporal traffic intensity maps.

## 🚦 Local Setup Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg**: Required for H.264 video re-encoding.
    *   *Windows*: `winget install ffmpeg`
    *   *Linux*: `sudo apt install ffmpeg`

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv (Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate)
pip install -r requirements.txt
python main.py
```
*Note: On first run, the system will automatically download the `yolo11m.pt` weights.*

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create a .env.local file:
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## 🧠 Engineering Methodology

### Handling Edge Cases: Double-Counting
The system prevents multiple counts of the same vehicle using a three-tier safeguard:
1.  **Unique Tracking IDs**: ByteTrack assigns a persistent ID to each detection.
2.  **Registry Persistence**: The `counted_ids` set ensures that once an ID triggers a line crossing, it is globally flagged for the rest of the session.
3.  **Boundary Logic**: The tripwire logic requires a clear state transition across the line coordinates, preventing "jitter" from triggering multiple events.

### Tracking Logic: Box Intersection
Standard "center-point" tracking is unreliable for slow-moving or long vehicles (trains/buses). Our logic monitors the **intersection of any bounding box edge** with the tripwire coordinate. This ensures that even if a vehicle occupies 50% of the screen, it is registered the exact moment it touches the counting line.

## 📝 Engineering Assumptions
- **Stability**: Assumes drone footage is stabilized (gimbal-locked).
- **Format**: Optimized specifically for `.mp4` containers to maintain web compatibility.
- **Hardware**: For local CPU execution, the pipeline is configured to use standard `torch` CPU inference, but A100/GPU acceleration is highly recommended for real-time performance.

---
Built by **RupomGg** | Empowering Smart City Infrastructure with Neural Intelligence.
