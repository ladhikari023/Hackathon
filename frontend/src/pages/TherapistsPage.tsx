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

interface TherapistRequest {
  id: string;
  therapist_id: string;
  therapist_name: string;
  intro_message: string;
  price_cents: number;
  status: "payment_pending" | "pending" | "accepted" | "rejected";
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

export default function TherapistsPage() {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  const [requestsByTherapist, setRequestsByTherapist] = useState<Record<string, TherapistRequest>>({});
  const [threadByRequest, setThreadByRequest] = useState<Record<string, TherapistThreadMessage[]>>({});
  const [threadDraftByRequest, setThreadDraftByRequest] = useState<Record<string, string>>({});
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/therapists")
      .then((res) => setTherapists(res.data))
      .catch(() => {});
    if (user?.role === "user") {
      api
        .get("/therapists/requests/mine")
        .then((res) =>
          setRequestsByTherapist(
            Object.fromEntries(
              res.data.map((item: TherapistRequest) => [item.therapist_id, item])
            )
          )
        )
        .catch(() => {});
    }
  }, [user?.role]);

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
                {requestsByTherapist[t.id] ? (
                  <div className="therapist-request-status-card">
                    <strong>
                      Status: {requestsByTherapist[t.id].status.replace("_", " ")}
                    </strong>
                    <p>
                      {requestsByTherapist[t.id].payment_status === "pending"
                        ? "Payment is still pending for this intro request."
                        : `Sent ${new Date(
                            requestsByTherapist[t.id].created_at
                          ).toLocaleString()}`}
                    </p>
                    {requestsByTherapist[t.id].status === "accepted" && (
                      <button
                        className="btn-outline"
                        onClick={async () => {
                          const requestId = requestsByTherapist[t.id].id;
                          if (!threadByRequest[requestId]) {
                            const res = await api.get(
                              `/therapists/requests/${requestId}/messages`
                            );
                            setThreadByRequest((prev) => ({
                              ...prev,
                              [requestId]: res.data,
                            }));
                          }
                          setOpenThreadId((prev) =>
                            prev === requestId ? null : requestId
                          );
                        }}
                      >
                        {openThreadId === requestsByTherapist[t.id].id
                          ? "Hide Messages"
                          : "Open Messages"}
                      </button>
                    )}
                  </div>
                ) : null}
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
                      const res = await api.post(`/therapists/${t.id}/intro-request`, {
                        intro_message: intro,
                      });
                      setRequestsByTherapist((prev) => ({
                        ...prev,
                        [t.id]: res.data,
                      }));
                      setDrafts((prev) => ({ ...prev, [t.id]: "" }));
                      if (res.data.requires_payment && res.data.checkout_url) {
                        window.location.href = res.data.checkout_url;
                        return;
                      }
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
                {requestsByTherapist[t.id]?.status === "accepted" &&
                openThreadId === requestsByTherapist[t.id].id ? (
                  <div className="therapist-thread">
                    <div className="therapist-thread-messages">
                      {(threadByRequest[requestsByTherapist[t.id].id] ?? []).map((msg) => (
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
                        value={threadDraftByRequest[requestsByTherapist[t.id].id] ?? ""}
                        onChange={(e) =>
                          setThreadDraftByRequest((prev) => ({
                            ...prev,
                            [requestsByTherapist[t.id].id]: e.target.value,
                          }))
                        }
                        placeholder="Write a message..."
                      />
                      <button
                        className="btn-primary btn-sm"
                        onClick={async () => {
                          const requestId = requestsByTherapist[t.id].id;
                          const message = (
                            threadDraftByRequest[requestId] ?? ""
                          ).trim();
                          if (!message) return;
                          const res = await api.post(
                            `/therapists/requests/${requestId}/messages`,
                            { message }
                          );
                          setThreadByRequest((prev) => ({
                            ...prev,
                            [requestId]: [...(prev[requestId] ?? []), res.data],
                          }));
                          setThreadDraftByRequest((prev) => ({
                            ...prev,
                            [requestId]: "",
                          }));
                        }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
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
