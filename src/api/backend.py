# ============================================================
# backend.py — Add this to your Colab notebook to expose
# a FastAPI endpoint that the React frontend calls
# ============================================================
#
# Run this cell in Colab AFTER loading your models:
#
#   from backend import start_server
#   url = start_server(pipeline)
#   print(f"API URL: {url}")
#   # Paste this URL into your React app's .env file

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn, threading, os, uuid
from pyngrok import ngrok

app = FastAPI(title="MusicGen AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline reference
_pipeline = None

class GenerateRequest(BaseModel):
    prompt: str
    tracks: Optional[List[str]] = None
    bars: Optional[int] = 8
    creativity: Optional[float] = 1.0
    tempo: Optional[int] = None
    max_tokens: Optional[int] = 256

@app.get("/health")
def health():
    return {"status": "ok", "models": list(_pipeline.models.keys()) if _pipeline else []}

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    # Unique output file per request
    out_path = f"/content/output_{uuid.uuid4().hex[:8]}.mid"

    try:
        _pipeline.generate(
            prompt      = req.prompt,
            output_path = out_path,
            max_tokens  = req.max_tokens,
            creativity  = req.creativity,
            tempo       = req.tempo,
            bars        = req.bars,
            tracks      = req.tracks,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(
        out_path,
        media_type="audio/midi",
        filename="generated_music.mid",
    )

def start_server(pipeline, port=8000):
    global _pipeline
    _pipeline = pipeline

    # Start ngrok tunnel
    public_url = ngrok.connect(port).public_url
    print(f"\n✅ API running at: {public_url}")
    print(f"   Add to React .env: VITE_COLAB_URL={public_url}\n")

    # Start uvicorn in background thread
    thread = threading.Thread(
        target=uvicorn.run,
        args=(app,),
        kwargs={"host": "0.0.0.0", "port": port, "log_level": "error"},
        daemon=True,
    )
    thread.start()
    return public_url