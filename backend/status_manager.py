# Shared state for task statuses and results
task_status = {}
task_results = {}

def update_status(video_id: str, status: str, results: dict = None):
    task_status[video_id] = status
    if results:
        task_results[video_id] = results

def get_status(video_id: str):
    return task_status.get(video_id, "unknown")

def get_results(video_id: str):
    return task_results.get(video_id, {})
