import { useState, useEffect } from "react";
import api from "../api/client";

interface PatientMood {
  id: string;
  user_name: string;
  mood: string;
  note: string;
  created_at: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "😢",
  stressed: "😰",
  angry: "😠",
  anxious: "😟",
};

export default function PatientInsightsPage() {
  const [moods, setMoods] = useState<PatientMood[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    api.get("/therapist-dashboard/patient-moods").then((res) => setMoods(res.data));
    api.get("/therapist-dashboard/patient-list").then((res) => setPatients(res.data));
  }, []);

  return (
    <div className="page insights-page">
      <header className="page-header">
        <h2>Patient Insights</h2>
        <p>Monitor patient wellbeing and mood trends</p>
      </header>

      <div className="insights-grid">
        <div className="insights-section">
          <h3>Patients ({patients.length})</h3>
          <div className="patient-list">
            {patients.map((p) => (
              <div key={p.id} className="patient-item">
                <div className="patient-avatar">
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="patient-name">{p.name}</div>
                  <div className="patient-email">{p.email}</div>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No patients yet.</p>
            )}
          </div>
        </div>

        <div className="insights-section">
          <h3>Recent Mood Logs</h3>
          <div className="mood-feed">
            {moods.map((m) => (
              <div key={m.id} className="mood-feed-item">
                <span className="mood-feed-emoji">
                  {MOOD_EMOJI[m.mood] ?? "🔵"}
                </span>
                <div className="mood-feed-content">
                  <div className="mood-feed-header">
                    <span className="mood-feed-name">{m.user_name}</span>
                    <span className="mood-feed-mood">{m.mood}</span>
                  </div>
                  {m.note && <p className="mood-feed-note">{m.note}</p>}
                  <span className="mood-feed-time">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {moods.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No mood logs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
