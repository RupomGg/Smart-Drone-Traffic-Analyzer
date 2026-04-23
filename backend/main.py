from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import shutil
from status_manager import update_status, get_status, get_results

app = FastAPI(title="Smart Drone Traffic Analyzer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_VIDEO_DIR = "temp_videos"
OUTPUT_VIDEO_DIR = "output_videos"
REPORT_DIR = "reports"

# Ensure directories exist (skip if on read-only Vercel environment)
if os.environ.get("VERCEL") != "1":
    os.makedirs(TEMP_VIDEO_DIR, exist_ok=True)
    os.makedirs(OUTPUT_VIDEO_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Smart Drone Traffic Analyzer API is running.",
        "docs": "/docs"
    }

def sanitize_filename(filename: str) -> str:
    # Remove directory paths and keep only alphanumeric, dots, and underscores
    filename = os.path.basename(filename)
    name, ext = os.path.splitext(filename)
    name = re.sub(r'[^a-zA-Z0-9_]', '', name)
    return f"{name}{ext}"

from cv_pipeline import run_cv_pipeline

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Drone Tracker API Connected"}

@app.get("/status/{video_id}")
async def check_status(video_id: str):
    status = get_status(video_id)
    results = get_results(video_id) if status == "completed" else None
    return {"status": status, "results": results}

@app.get("/report/{video_id}")
async def get_report(video_id: str):
    report_path = os.path.join("reports", f"report_{video_id}.csv")
    if os.path.exists(report_path):
        return FileResponse(report_path, media_type="text/csv", filename=f"traffic_report_{video_id}.csv")
    else:
        raise HTTPException(status_code=404, detail="Report not found.")

@app.get("/video/{video_id}")
async def get_processed_video(video_id: str):
    video_path = os.path.join("output_videos", f"processed_{video_id}")
    if os.path.exists(video_path):
        return FileResponse(video_path, media_type="video/mp4")
    else:
        raise HTTPException(status_code=404, detail="Processed video not found.")

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if file.content_type != "video/mp4":
        raise HTTPException(status_code=400, detail="Only MP4 videos are allowed.")

    sanitized_name = sanitize_filename(file.filename)
    file_path = os.path.join(TEMP_VIDEO_DIR, sanitized_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Update status to processing
    update_status(sanitized_name, "processing")

    # Trigger CV pipeline in background
    background_tasks.add_task(run_cv_pipeline, file_path)

    return {"status": "processing", "video_id": sanitized_name}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
