// Utility to send telemetry events to our backend

const TELEMETRY_API_URL = 'http://localhost:3000/api/telemetry/events'

// In a real app, generate/store a real UUID for the user and session
export const getUserId = () => {
  let userId = localStorage.getItem('telemetry_user_id')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('telemetry_user_id', userId)
  }
  return userId
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
  const sessionId = getSessionId()

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
      headers: { 'Content-Type': 'application/json' },
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
