// Utility to send telemetry events to our backend
import { useAuthStore } from '../store/useAuthStore';

// VITE_API_URL is empty in dev → relative path goes through Vite proxy to localhost:3000.
// In production, set VITE_API_URL to your deployed backend URL.
const TELEMETRY_API_URL = `${import.meta.env.VITE_API_URL || ''}/api/telemetry/events`

// In a real app, generate/store a real UUID for the user and session
export const getUserId = () => {
  return useAuthStore.getState().user?.id || null;
}

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('telemetry_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('telemetry_session_id', sessionId)
  }
  return sessionId
}

export const logPlaybackEvent = async ({
  track,
  eventType,
  contextSource = 'unknown',
  durationListenedMs = 0
}) => {
  const userId = getUserId()
  const token = useAuthStore.getState().token;
  const sessionId = getSessionId()

  if (!userId || !token) {
    return; // Do not log telemetry for unauthenticated users
  }

  const payload = {
    userId,
    trackId: track.id,
    title: track.title || track.name,
    artist: track.primaryArtists || track.artist || track.subtitle,
    genre: track.language || track.genre,
    durationMs: track.duration ? parseInt(track.duration) * 1000 : undefined,
    sessionId,
    eventType,
    contextSource,
    durationListenedMs
  }

  try {
    // 1. Send to Node.js Analytics Backend
    await fetch(TELEMETRY_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    // 2. Send to Python ML Microservice (Update Taste Profile)
    if (eventType === 'play_completed' || eventType === 'skipped') {
      const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
      await fetch(`${ML_API_URL}/api/ml/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          track_id: track.id,
          event_type: eventType
        })
      }).catch(e => console.warn('ML profile update failed:', e))
    }

  } catch (error) {
    console.error('[Telemetry] Failed to log event:', error)
  }
}
