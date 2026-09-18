"""X-Trust + FastAPI example. pip install fastapi htl-verify"""
from fastapi import FastAPI, Request, HTTPException
from htl_verify import verify
import os

app = FastAPI()
SECRET = os.environ["HTL_SECRET"]

@app.post("/chat")
async def chat(request: Request):
    token = request.headers.get("x-trust", "")
    result = verify(token, SECRET)
    # AIR doctrine: annotate, never block. Log the signal, do not reject.
    print(f"trusted={result['trusted']} score={result['score']}")
    return {"ok": True, "trusted": result["trusted"], "score": result["score"]}
