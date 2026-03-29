import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

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

interface TherapistIntroRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_bio: string;
  user_health_status: string;
  intro_message: string;
  price_cents: number;
  status: "pending" | "accepted" | "rejected";
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
  const { user } = useAuth();
  const [moods, setMoods] = useState<PatientMood[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [introRequests, setIntroRequests] = useState<TherapistIntroRequest[]>([]);
  const [priceDollars, setPriceDollars] = useState("0");

  useEffect(() => {
    api.get("/therapist-dashboard/patient-moods").then((res) => setMoods(res.data));
    api.get("/therapist-dashboard/patient-list").then((res) => setPatients(res.data));
    api.get("/therapists/requests/incoming").then((res) => setIntroRequests(res.data));
    api.get("/therapists").then((res) => {
      const mine = res.data.find((item: any) => item.name === user?.name);
      if (mine) {
        setPriceDollars((mine.intro_message_price_cents / 100).toFixed(2));
      }
    });
  }, [user?.name]);

  return (
    <div className="page insights-page">
      <header className="page-header">
        <h2>Patient Insights</h2>
        <p>Monitor patient wellbeing and mood trends</p>
      </header>

      <div className="insights-grid">
        <div className="insights-section">
          <h3>Intro Message Settings</h3>
          <div className="therapist-pricing-form">
            <label htmlFor="intro-price">Initial message price (USD)</label>
            <div className="comment-form">
              <input
                id="intro-price"
                type="number"
                min="0"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
              <button
                className="btn-primary btn-sm"
                onClick={async () => {
                  const cents = Math.max(0, Math.round(Number(priceDollars || "0") * 100));
                  await api.patch("/therapists/me/pricing", {
                    intro_message_price_cents: cents,
                  });
                }}
              >
                Save
              </button>
            </div>
            <p style={{ color: "var(--text-muted)" }}>
              Set to `0` to make the initial message free.
            </p>
          </div>
        </div>

        <div className="insights-section">
          <h3>Incoming Intro Requests</h3>
          <div className="mood-feed">
            {introRequests.map((request) => (
              <div key={request.id} className="mood-feed-item therapist-request-card">
                <div className="mood-feed-content">
                  <div className="mood-feed-header">
                    <span className="mood-feed-name">{request.user_name}</span>
                    <span className="mood-feed-mood">{request.status}</span>
                  </div>
                  <p className="mood-feed-note">{request.intro_message}</p>
                  <p className="mood-feed-note">
                    Health status: {request.user_health_status || "Not shared"}
                  </p>
                  <p className="mood-feed-note">
                    Bio: {request.user_bio || "No bio shared"}
                  </p>
                  <span className="mood-feed-time">
                    {request.price_cents === 0
                      ? "Free intro"
                      : `Charged at $${(request.price_cents / 100).toFixed(2)}`}{" "}
                    · {new Date(request.created_at).toLocaleString()}
                  </span>
                  {request.status === "pending" && (
                    <div className="therapist-request-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={async () => {
                          await api.post(`/therapists/requests/${request.id}/accept`);
                          setIntroRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id
                                ? { ...item, status: "accepted" }
                                : item
                            )
                          );
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-outline btn-sm"
                        onClick={async () => {
                          await api.post(`/therapists/requests/${request.id}/reject`);
                          setIntroRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id
                                ? { ...item, status: "rejected" }
                                : item
                            )
                          );
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {introRequests.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No intro requests yet.</p>
            )}
          </div>
        </div>

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
