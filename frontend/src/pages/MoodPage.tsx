import { useState } from "react";
import api from "../api/client";

const moods = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "stressed", emoji: "😰", label: "Stressed" },
  { value: "angry", emoji: "😠", label: "Angry" },
  { value: "anxious", emoji: "😟", label: "Anxious" },
];

export default function MoodPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!selected) return;
    setError("");

    try {
      await api.post("/mood/log", { mood: selected, note });
      setSubmitted(true);
    } catch {
      setError("Failed to log mood. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="page mood-page">
        <header className="page-header">
          <h2>Mood Tracker</h2>
        </header>
        <div className="mood-success">
          <div className="success-icon">✅</div>
          <h3>Mood logged!</h3>
          <p>Keep tracking daily to see your emotional patterns.</p>
          <button
            className="btn-primary"
            onClick={() => {
              setSubmitted(false);
              setSelected(null);
              setNote("");
            }}
          >
            Log another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page mood-page">
      <header className="page-header">
        <h2>Mood Tracker</h2>
        <p>How are you feeling right now?</p>
      </header>

      <div className="mood-grid">
        {moods.map((mood) => (
          <button
            key={mood.value}
            className={`mood-option ${selected === mood.value ? "selected" : ""}`}
            onClick={() => setSelected(mood.value)}
          >
            <span className="mood-emoji">{mood.emoji}</span>
            <span className="mood-label">{mood.label}</span>
          </button>
        ))}
      </div>

      <div className="mood-note">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about how you're feeling (optional)..."
          rows={3}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn-primary"
        disabled={!selected}
        onClick={handleSubmit}
      >
        Log Mood
      </button>
    </div>
  );
}
