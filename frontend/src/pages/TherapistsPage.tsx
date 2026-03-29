import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  languages: string;
  bio: string;
  intro_message_price_cents: number;
  intro_message_is_free: boolean;
}

export default function TherapistsPage() {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get("/therapists")
      .then((res) => setTherapists(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="page therapists-page">
      <header className="page-header">
        <h2>Find a Therapist</h2>
        <p>Connect with mental health professionals</p>
      </header>

      <div className="therapist-grid">
        {therapists.map((t) => (
          <div key={t.id} className="therapist-card">
            <div className="therapist-avatar">
              {t.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <h3>{t.name}</h3>
            <span className="specialization">{t.specialization}</span>
            <p className="bio">{t.bio}</p>
            <p className="languages">🌐 {t.languages}</p>
            <div className="therapist-intro-pricing">
              {t.intro_message_is_free
                ? "Initial message is free"
                : `Initial message: $${(t.intro_message_price_cents / 100).toFixed(2)}`}
            </div>
            {user?.role === "user" ? (
              <div className="therapist-intro-box">
                <textarea
                  value={drafts[t.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  placeholder="Send a short introduction message..."
                  rows={3}
                />
                <button
                  className="btn-outline"
                  disabled={sendingId === t.id || !(drafts[t.id] ?? "").trim()}
                  onClick={async () => {
                    const intro = (drafts[t.id] ?? "").trim();
                    if (!intro) return;
                    setSendingId(t.id);
                    setStatusById((prev) => ({ ...prev, [t.id]: "" }));
                    try {
                      await api.post(`/therapists/${t.id}/intro-request`, {
                        intro_message: intro,
                      });
                      setDrafts((prev) => ({ ...prev, [t.id]: "" }));
                      setStatusById((prev) => ({
                        ...prev,
                        [t.id]: "Intro message sent. Waiting for therapist response.",
                      }));
                    } catch (err: any) {
                      setStatusById((prev) => ({
                        ...prev,
                        [t.id]:
                          err?.response?.data?.detail ??
                          "Unable to send your intro message right now.",
                      }));
                    } finally {
                      setSendingId(null);
                    }
                  }}
                >
                  {sendingId === t.id ? "Sending..." : "Send Intro"}
                </button>
                {statusById[t.id] ? (
                  <p className="therapist-intro-status">{statusById[t.id]}</p>
                ) : null}
              </div>
            ) : (
              <button className="btn-outline">Book Session</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
