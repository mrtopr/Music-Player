import urllib.request
import json
import random
import time

ML_API_URL = "http://localhost:8000/api/ml/features"

# Generate 100 mock track IDs with realistic acoustic features
# BPM (60-180), Energy (0.0-1.0), Valence (0.0-1.0)
def generate_mock_data():
    tracks = []
    for i in range(1, 101):
        # We will generate IDs in a format that looks like JioSaavn track IDs (e.g. alphanumeric strings)
        track_id = f"mock_track_{i}"
        
        # Creating some clustering (e.g. upbeat pop vs slow acoustic)
        if random.random() > 0.5:
            # Upbeat / High Energy
            bpm = random.uniform(110.0, 160.0)
            energy = random.uniform(0.6, 1.0)
            valence = random.uniform(0.5, 1.0)
        else:
            # Slow / Chill
            bpm = random.uniform(60.0, 100.0)
            energy = random.uniform(0.1, 0.5)
            valence = random.uniform(0.1, 0.6)
            
        tracks.append({
            "track_id": track_id,
            "bpm": bpm,
            "energy": energy,
            "valence": valence
        })
    return tracks

def seed_database():
    print("🌱 Generating mock acoustic features...")
    tracks = generate_mock_data()
    
    success_count = 0
    for track in tracks:
        try:
            req = urllib.request.Request(ML_API_URL, data=json.dumps(track).encode('utf-8'), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    success_count += 1
        except Exception as e:
            print(f"Failed to seed {track['track_id']}: {e}")
            break
            
    print(f"✅ Successfully seeded {success_count} tracks into the ML Vector Memory!")
    print("The Recommendation Engine is now fully primed for Cosine Similarity searches.")

if __name__ == "__main__":
    # Give the server a tiny bit of time if this is run as part of a startup script
    time.sleep(1)
    seed_database()
