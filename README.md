# 🎵 MusicGen AI — React Frontend

A cinematic, editorial-style music generator frontend inspired by ownitt.fr.
Built with React + Vite + Framer Motion.

## Design Language
- Pure black background
- Massive Playfair Display serif headlines  
- Bebas Neue for UI labels
- DM Mono for body/code
- Minimal borders — everything floats on black
- Custom cursor with mix-blend-mode difference
- Scrolling marquee strips
- Horizontal grid layout for track selection

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the Colab backend

In your Colab notebook, after loading all models:
```python
!pip install fastapi uvicorn pyngrok -q
from backend import start_server
url = start_server(pipeline)
```

### 3. Add the Colab URL to .env
```bash
# Create .env file
echo "VITE_COLAB_URL=https://your-ngrok-url.ngrok.io" > .env
```

### 4. Run the dev server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Build for production
```bash
npm run build
npm run preview
```

## Deploy to Vercel/Netlify
```bash
# Vercel
npx vercel --prod

# Netlify
npx netlify deploy --prod --dir=dist
```

Set `VITE_COLAB_URL` as an environment variable in your deployment platform.

## Project Structure
```
src/
├── App.jsx          ← main app with all UI
├── App.css          ← full styles (ownitt-inspired)
├── main.jsx         ← react entry point
└── api/
    ├── musicApi.js  ← calls Colab backend
    └── backend.py   ← FastAPI server (run in Colab)
```

## Features
- Text prompt input with example chips
- Track selector (Drums / Bass / Chords / Melody)
- Quick presets (Full band, Harmony only, Melody only...)  
- Controls: duration, creativity, tempo, max tokens
- Animated generation progress
- Output stats (BPM, mood, tracks, duration)
- Track visualization bars
- MIDI download