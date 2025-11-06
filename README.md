# Counterfactual Replay Prompt Evaluation Toolkit



---

## Project Structure

```
backend/         # Node.js/Express backend server and DB server
  server.js      # Main API server
  db-server.js   # JSON DB server
  media/         # Place your .mp4 and .srt files here
frontend/    # React + Vite frontend (Replay interface)
```

---

## 1. Backend Server (Express.js)

**Setup:**
  1. Copy `.env.template` to `.env` and fill in your `OPENAI_API_KEY` and other secrets.
  2. Install dependencies:
     ```sh
     cd backend
     npm install
     ```
**Start:**
  ```sh
  node server.js
  # or for development with auto-reload:
  npm run dev
  ```

---

## 2. DB Server (json-server)

**Setup:**
  1. Copy `db_template.json` to `db.json` in the backend folder.
  2. Set `DB_FILE=db.json` in your `.env`.
**Start:**
  ```sh
  node db-server.js
  ```

---

## 3. Replay Frontend (React App)

**Setup:**
  ```sh
  cd frontend
  npm install
  ```
**Start:**
  ```sh
  npm run dev
  ```
The app will be available at [http://localhost:5173/](http://localhost:5173/)

---

## General Workflow

1. *Preparing videos and transcripts:* For each video file (only `.mp4` supported), create a transcript with the same filename and save it as `.srt` (e.g., using [Mac Whisper](https://goodsnooze.gumroad.com/l/macwhisper)) in `backend/media/`.
2. Start the backend server.
3. Start the DB server (separate process).
4. Start the frontend.














