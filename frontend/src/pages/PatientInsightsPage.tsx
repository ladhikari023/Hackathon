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
  payment_status: "not_required" | "pending" | "paid";
  created_at: string;
}

interface TherapistThreadMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  is_me: boolean;
  message: string;
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
  const [threadByRequest, setThreadByRequest] = useState<Record<string, TherapistThreadMessage[]>>({});
  const [threadDraftByRequest, setThreadDraftByRequest] = useState<Record<string, string>>({});
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/therapist-dashboard/patient-moods").then((res) => setMoods(res.data));
    api.get("/therapist-dashboard/patient-list").then((res) => setPatients(res.data));
    api.get("/therapists/requests/incoming").then((res) => setIntroRequests(res.data));
  }, [user?.name]);

  return (
    <div className="page insights-page">
      <header className="page-header">
        <h2>Patient Insights</h2>
        <p>Monitor patient wellbeing and mood trends</p>
      </header>

      <div className="insights-grid">
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
                    {request.payment_status === "pending"
                      ? "Awaiting Stripe payment"
                      : request.price_cents === 0
                        ? "Free intro"
                        : `Paid intro: $${(request.price_cents / 100).toFixed(2)}`}{" "}
                    ·{" "}
                    {new Date(request.created_at).toLocaleString()}
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
                  {request.status === "accepted" && (
                    <>
                      <button
                        className="btn-outline btn-sm"
                        onClick={async () => {
                          if (!threadByRequest[request.id]) {
                            const res = await api.get(
                              `/therapists/requests/${request.id}/messages`
                            );
                            setThreadByRequest((prev) => ({
                              ...prev,
                              [request.id]: res.data,
                            }));
                          }
                          setOpenThreadId((prev) =>
                            prev === request.id ? null : request.id
                          );
                        }}
                      >
                        {openThreadId === request.id ? "Hide Messages" : "Open Messages"}
                      </button>
                      {openThreadId === request.id && (
                        <div className="therapist-thread">
                          <div className="therapist-thread-messages">
                            {(threadByRequest[request.id] ?? []).map((msg) => (
                              <div
                                key={msg.id}
                                className={`therapist-thread-message ${msg.is_me ? "me" : ""}`}
                              >
                                <strong>{msg.is_me ? "You" : msg.sender_name}</strong>
                                <p>{msg.message}</p>
                              </div>
                            ))}
                          </div>
                          <div className="comment-form">
                            <input
                              value={threadDraftByRequest[request.id] ?? ""}
                              onChange={(e) =>
                                setThreadDraftByRequest((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              placeholder="Reply to this client..."
                            />
                            <button
                              className="btn-primary btn-sm"
                              onClick={async () => {
                                const message = (threadDraftByRequest[request.id] ?? "").trim();
                                if (!message) return;
                                const res = await api.post(
                                  `/therapists/requests/${request.id}/messages`,
                                  { message }
                                );
                                setThreadByRequest((prev) => ({
                                  ...prev,
                                  [request.id]: [...(prev[request.id] ?? []), res.data],
                                }));
                                setThreadDraftByRequest((prev) => ({
                                  ...prev,
                                  [request.id]: "",
                                }));
                              }}
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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
