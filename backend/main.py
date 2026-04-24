from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
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
async def get_processed_video(video_id: str, request: Request):
    video_path = os.path.join("output_videos", f"processed_{video_id}")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Processed video not found.")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    def iter_file(path: str, start: int, end: int, chunk: int = 1024 * 256):
        with open(path, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                data = f.read(min(chunk, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    if range_header:
        # Parse Range: bytes=start-end
        range_val = range_header.strip().replace("bytes=", "")
        range_start, _, range_end = range_val.partition("-")
        start = int(range_start)
        end = int(range_end) if range_end else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(
            iter_file(video_path, start, end),
            status_code=206,
            headers=headers,
            media_type="video/mp4",
        )

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(
        iter_file(video_path, 0, file_size - 1),
        status_code=200,
        headers=headers,
        media_type="video/mp4",
    )

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
