# Shared state for task statuses, progress, and results
task_status = {}
task_progress = {}
task_results = {}

def update_status(video_id: str, status: str, results: dict = None, progress: int = 0):
    task_status[video_id] = status
    task_progress[video_id] = progress
    if results:
        task_results[video_id] = results

def get_status_info(video_id: str):
    return {
        "status": task_status.get(video_id, "unknown"),
        "progress": task_progress.get(video_id, 0),
        "results": task_results.get(video_id, {}) if task_status.get(video_id) == "completed" else None
    }
