// src/api/musicApi.js
const COLAB_URL = import.meta.env.VITE_COLAB_URL || 'http://localhost:8000'

export async function generateMusic({
  prompt,
  tracks,
  bars,
  creativity,
  tempo,
  maxTokens,
}) {
  const response = await fetch(`${COLAB_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',    // localtunnel bypass
      'ngrok-skip-browser-warning': 'true' // ngrok bypass
    },
    body: JSON.stringify({
      prompt,
      tracks,
      bars,
      creativity,
      tempo,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Generation failed: ${response.status} — ${detail}`)
  }

  const blob = await response.blob()
  return blob
}

export async function checkHealth() {
  try {
    const response = await fetch(`${COLAB_URL}/health`, {
      headers: {
        'bypass-tunnel-reminder': 'true',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const data = await response.json()
    return data
  } catch (e) {
    return { status: 'error', message: e.message }
  }
}

export function downloadMidi(blob, filename = 'generated_music.mid') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}