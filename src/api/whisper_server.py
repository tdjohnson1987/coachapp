# whisper_server.py
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import torch
import tempfile

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "openai/whisper-small"

print("Loading Whisper model...")
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id,
    torch_dtype=torch_dtype,
    low_cpu_mem_usage=True,
)
model.to(device)
processor = AutoProcessor.from_pretrained(model_id)

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/stt")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("auto"),
):
    # Save upload to temp file
    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Build kwargs
    generate_kwargs = {}
    if language != "auto":
        generate_kwargs["language"] = language

    # Ask for timestamps so you can create segments
    result = pipe(
        tmp_path,
        return_timestamps="word",  # or True for sentence-level chunks
        generate_kwargs=generate_kwargs,
    )

    # result["text"] = full text
    # result["chunks"] = list of words or sentences with timestamps
    chunks = result.get("chunks", [])

    segments = [
        {
            "start_time": float(chunk["timestamp"][0]),
            "end_time": float(chunk["timestamp"][1]),
            "text": chunk["text"],
        }
        for chunk in chunks
        if chunk.get("timestamp") is not None
    ]

    return {
        "text": result.get("text", ""),
        "segments": segments,
        "language": language if language != "auto" else None,
        # Whisper doesn’t give a single confidence; keep 0 or compute later
        "confidence": 0.0,
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# python3 -m venv .venv

# # Activate the venv
# source .venv/bin/activate

# # Install dependencies
# pip install --upgrade pip
# pip install "fastapi[standard]" uvicorn "transformers[torch]" "datasets[audio]" accelerate

# # Run the server
# python3 src/api/whisper_server.py