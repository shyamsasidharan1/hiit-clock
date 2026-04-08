# HIIT Clock — Project Manifest for Claude Code

## Project Overview

Build a React web app called **HIIT Clock** that lets users upload a plain-text workout file, select a workout session from it, and run a guided interval timer with full audio cues using the browser's Web Speech API (Text-to-Speech). The app should be deployable to **AWS Amplify**.

---

## Tech Stack

- **Framework:** React + Vite (`npm create vite@latest hiit-clock -- --template react`)
- **Styling:** Plain CSS or Tailwind CSS (your choice; keep it clean and mobile-friendly)
- **Audio:** Web Speech API (`window.speechSynthesis`) — no external libraries needed
- **State management:** React `useState` / `useReducer` / `useRef` (no Redux needed)
- **Deployment target:** AWS Amplify (static site)

No backend is required. Everything runs in the browser.

---

## Workout File Format (`.txt`)

Users upload plain `.txt` files. Each file defines one or more **workout sessions**. The format is:

```
[Session Name]
Exercise Name, work_seconds, rest_seconds
Exercise Name, work_seconds, rest_seconds
...

[Another Session Name]
Exercise Name, work_seconds, rest_seconds
...
```

### Rules
- Session names are enclosed in `[square brackets]` on their own line.
- Each exercise line has three comma-separated values: name, work duration (seconds), rest duration (seconds).
- Blank lines between sessions are ignored.
- Lines starting with `#` are comments and should be ignored.
- Work and rest durations are integers (seconds). Rest duration of `0` means no rest after that exercise.

### Example file
```
# Morning HIIT

[Full Body Blast]
Jumping Jacks, 45, 15
Push-Ups, 30, 10
Burpees, 40, 20
Mountain Climbers, 30, 10
Squat Jumps, 45, 15

[Core Focus]
Plank, 60, 15
Bicycle Crunches, 40, 10
Leg Raises, 30, 15
Russian Twists, 40, 10
```

---

## App Structure

```
hiit-clock/
├── public/
├── src/
│   ├── components/
│   │   ├── FileUploader.jsx       # Drag-and-drop / click-to-upload txt file
│   │   ├── SessionPicker.jsx      # List of sessions parsed from the file
│   │   ├── WorkoutTimer.jsx       # Main timer UI and logic
│   │   └── AudioController.js    # All TTS / speech synthesis logic (not a component)
│   ├── utils/
│   │   └── parseWorkout.js        # Parses the txt file into a data structure
│   ├── App.jsx
│   └── main.jsx
├── CLAUDE.md
├── index.html
├── package.json
└── vite.config.js
```

---

## Feature Requirements

### 1. File Upload (`FileUploader.jsx`)
- Display a clean upload area (drag-and-drop + click-to-browse).
- Accept only `.txt` files. Show a friendly error if a non-`.txt` file is dropped.
- On successful upload, parse the file and pass the structured data up to `App.jsx`.
- Show the filename after upload.
- Allow the user to upload a different file (reset button).

### 2. Session Picker (`SessionPicker.jsx`)
- After a file is uploaded, display a list of all sessions found in the file.
- Each session shows: session name + number of exercises + total estimated time (sum of all work + rest durations).
- Clicking a session selects it and transitions to the timer screen.
- Include a "Back" button to return to the file upload screen.

### 3. Workout Timer (`WorkoutTimer.jsx`)

#### Timer display
- Large, prominent countdown timer (MM:SS format).
- Current exercise name displayed prominently.
- Phase label: **"WORK"** (green) or **"REST"** (blue/grey).
- **Interval progress bar** — shows progress through the current exercise interval (work or rest phase). Resets to 0% at the start of each new phase.
- **Session progress bar** — a full-width bar at the top (or bottom) of the timer screen showing total elapsed time vs total session time. Calculated as `totalElapsedSeconds / totalSessionDuration`. Display elapsed time and total time as a label next to or below the bar (e.g. `1:23 / 8:30`). This bar never resets during a session — it only moves forward.
- Up next: show the name of the next exercise (or "Finish" if it's the last one).
- Overall progress: e.g. "Exercise 3 of 7".

#### Progress bar implementation notes
- `totalSessionDuration` = sum of all `workDuration + restDuration` across every exercise in the session. Compute this once when the session starts.
- `totalElapsedSeconds` increments every second regardless of which phase is active. It must **not** reset on skip or phase transitions — it always represents real time elapsed since the session started.
- When the user **pauses**, `totalElapsedSeconds` freezes (does not increment).
- When the user **skips** an interval, jump `totalElapsedSeconds` forward by the remaining seconds of the skipped interval so the session bar stays accurate.
- Style the session bar distinctly from the interval bar — e.g. thinner, placed at the very top of the screen as a persistent "overall progress" indicator, using a neutral accent color (not green/blue, which are used for work/rest).

#### Controls
- **Start / Pause / Resume** button.
- **Skip** button — skips the current interval (work or rest) and moves to the next.
- **Restart Session** button — resets to the beginning of the session.
- **Back to Sessions** button — returns to the session picker (with a confirmation if the workout is in progress).

#### Timer logic
- On start, begin with the first exercise's **work** phase.
- When work phase ends → transition to **rest** phase (if rest > 0).
- When rest phase ends → move to next exercise's work phase.
- When the last exercise's rest phase ends → show a "Workout Complete!" screen with total elapsed time.
- Pause freezes the countdown exactly. Resume continues from where it left off.

---

## Audio Cue Requirements (`AudioController.js`)

Use `window.speechSynthesis` for all audio. All speech should be clear and timed correctly. Do not overlap speech calls — cancel any in-progress speech before starting a new one.

Implement the following cues:

| Trigger | What to say |
|---|---|
| Session starts | `"Starting [Session Name]. First exercise: [Exercise Name]."` |
| Work phase begins | `"[Exercise Name]. Go!"` |
| Halfway through work | `"Halfway!"` (fire exactly at 50% of work duration) |
| 3 seconds left in work | `"Three. Two. One."` (one word per second) |
| Work phase ends → rest | `"Rest."` |
| 3 seconds left in rest | `"Get ready!"` |
| Rest phase ends → next exercise | `"[Next Exercise Name]. Go!"` |
| Last exercise completes | `"Well done! Workout complete."` |
| User pauses | (no speech) |
| User skips | Announce the next phase as if it started normally |

### Speech settings
- Use `SpeechSynthesisUtterance` with `rate: 1.0`, `pitch: 1.0`, `volume: 1.0`.
- Default to the first available English voice. Allow the user to pick from available voices in a small settings panel.
- Include a **mute toggle** button on the timer screen to disable all audio without affecting the timer.

---

## Additional UI Requirements

- The app should work well on both **desktop and mobile**.
- Keep the design minimal and distraction-free — full focus on the timer during a workout.
- Show a **settings icon** (gear) that opens a small panel for: voice selection, speech rate (0.8x / 1.0x / 1.2x).
- Use a dark theme by default (easy on the eyes during workouts). A light/dark toggle is a nice-to-have.

---

## Error Handling

- If the uploaded `.txt` file has no valid sessions, show a clear error message with an example of the expected format.
- If `window.speechSynthesis` is not supported, show a warning banner: "Audio cues are not supported in this browser. Consider using Chrome."
- If a session has zero exercises after parsing, skip it and show a warning.

---

## Parsing Logic (`parseWorkout.js`)

Export a single function:

```js
/**
 * Parses a workout txt file string into structured data.
 * @param {string} text - Raw file contents
 * @returns {{ sessions: Session[], errors: string[] }}
 *
 * Session = {
 *   name: string,
 *   exercises: Exercise[]
 * }
 *
 * Exercise = {
 *   name: string,
 *   workDuration: number,  // seconds
 *   restDuration: number   // seconds
 * }
 */
export function parseWorkoutFile(text) { ... }
```

Return both `sessions` (successfully parsed) and `errors` (any lines that couldn't be parsed, with line numbers) so the UI can display warnings.

---

## AWS Amplify Deployment

Include an `amplify.yml` in the project root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Also add a `public/_redirects` file (for Amplify/Netlify SPA routing):

```
/*    /index.html    200
```

---

## Sample Workout File to Include

Include a sample file at `public/sample-workout.txt` using the example content from the File Format section above. This allows users to try the app immediately without uploading their own file. Add a "Try with sample file" button on the upload screen.

---

## Out of Scope (Do Not Build)

- No backend, database, or user accounts.
- No saving workouts to localStorage or IndexedDB.
- No video or image support.
- No custom sound files — use only Web Speech API.
