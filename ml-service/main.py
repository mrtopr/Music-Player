from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from contextlib import asynccontextmanager

# In-memory mock feature store for the MVP (since we don't have real embeddings yet)
# A real implementation would query pgvector or Milvus
MOCK_FEATURES = {}
USER_VECTORS = {} # Stores the dynamic taste profile for each user

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting up ML Recommendation Engine...")
    yield
    # Shutdown logic
    print("Shutting down...")

app = FastAPI(title="Mehfil ML Microservice", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    user_id: str
    current_track_id: str
    limit: int = 1
    client_hour: int = 12 # Default to noon if not provided

class TrackFeature(BaseModel):
    track_id: str
    bpm: float
    energy: float
    valence: float

class TelemetryEvent(BaseModel):
    user_id: str
    track_id: str
    event_type: str # 'play_completed' or 'skipped'

def get_or_create_vector(track_id: str) -> np.ndarray:
    if track_id in MOCK_FEATURES:
        return MOCK_FEATURES[track_id]
    
    # Generate deterministic pseudo-vector from track_id string
    seed = sum(ord(c) for c in track_id)
    bpm = 80.0 + (seed % 80)
    energy = (seed % 100) / 100.0
    valence = ((seed * 17) % 100) / 100.0
    vec = np.array([bpm, energy, valence])
    MOCK_FEATURES[track_id] = vec
    return vec

@app.post("/api/ml/features")
async def store_features(feature: TrackFeature):
    """Store audio features for a track to generate embeddings."""
    MOCK_FEATURES[feature.track_id] = np.array([feature.bpm, feature.energy, feature.valence])
    return {"success": True, "message": "Features stored"}

@app.get("/api/ml/features/{track_id}")
async def get_features(track_id: str):
    """Retrieve audio features for dynamic UI."""
    vector = get_or_create_vector(track_id)
    return {"success": True, "bpm": float(vector[0]), "energy": float(vector[1]), "valence": float(vector[2])}

@app.post("/api/ml/update-profile")
async def update_profile(event: TelemetryEvent):
    """Update the user's taste vector based on their listening behavior."""
    track_vector = get_or_create_vector(event.track_id)
        
    user_vector = USER_VECTORS.get(event.user_id, np.zeros(3))
    
    # Vector Math: Move closer if completed, move slightly away if skipped
    LEARNING_RATE = 0.1
    if event.event_type == 'play_completed':
        # Shift towards the track
        user_vector = user_vector + LEARNING_RATE * (track_vector - user_vector)
    elif event.event_type == 'skipped':
        # Shift away from the track
        user_vector = user_vector - (LEARNING_RATE * 0.5) * (track_vector - user_vector)
        
    USER_VECTORS[event.user_id] = user_vector
    return {"success": True, "message": "User profile updated"}

@app.post("/api/ml/recommend")
async def get_recommendations(req: RecommendationRequest):
    """
    Recommend the next tracks based on the current track using Cosine Similarity.
    This acts as the core of the dynamic Auto-Queue.
    """
    current_vector = get_or_create_vector(req.current_track_id)
    user_vector = USER_VECTORS.get(req.user_id)

    # Blend the user's long-term taste with their current song (70% current song, 30% user taste)
    if user_vector is not None:
        search_vector = (0.7 * current_vector) + (0.3 * user_vector)
    else:
        search_vector = current_vector.copy()

    # Apply Time-of-Day Context (Hyper-Personalization)
    if req.client_hour >= 22 or req.client_hour <= 5:
        search_vector[0] = search_vector[0] * 0.8
        search_vector[1] = search_vector[1] * 0.7
    elif (6 <= req.client_hour <= 11) or (15 <= req.client_hour <= 18):
        search_vector[0] = search_vector[0] * 1.1
        search_vector[1] = search_vector[1] * 1.15

    # 2. Compare against known tracks
    candidates = []
    for track_id, vector in MOCK_FEATURES.items():
        if track_id == req.current_track_id:
            continue
            
        sim = cosine_similarity(search_vector.reshape(1, -1), vector.reshape(1, -1))[0][0]
        candidates.append({"track_id": track_id, "score": float(sim)})
        
    # Sort by highest similarity
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "success": True,
        "recommendations": candidates[:req.limit]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
