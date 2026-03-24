import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/client";

interface MatchInfo {
  id: string;
  status: "waiting" | "active" | "buddy" | "ended";
  my_buddy_opt: boolean;
  peer_buddy_opt: boolean;
  peer_name: string;
  created_at: string;
}

interface PeerMsg {
  id: string;
  sender_id: string;
  is_me: boolean;
  sender_name: string;
  message: string;
  created_at: string;
}

interface Buddy {
  match_id: string;
  buddy_name: string;
  since: string;
}

export default function PeerMatchPage() {
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [messages, setMessages] = useState<PeerMsg[]>([]);
  const [input, setInput] = useState("");
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"match" | "buddies">("match");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  // Fetch current match state
  const fetchMatch = useCallback(async () => {
    try {
      const res = await api.get("/peers/match");
      setMatch(res.data);
      return res.data as MatchInfo | null;
    } catch {
      return null;
    }
  }, []);

  // Fetch messages for active match
  const fetchMessages = useCallback(
    async (matchId: string) => {
      try {
        const res = await api.get(`/peers/match/${matchId}/messages`);
        setMessages(res.data);
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    (async () => {
      const m = await fetchMatch();
      if (m && (m.status === "active" || m.status === "buddy")) {
        await fetchMessages(m.id);
      }
      try {
        const res = await api.get("/peers/buddies");
        setBuddies(res.data);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [fetchMatch, fetchMessages]);

  // Poll while waiting or chatting
  useEffect(() => {
    if (!match) return;

    if (match.status === "waiting") {
      pollRef.current = setInterval(async () => {
        const m = await fetchMatch();
        if (m && m.status !== "waiting") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          await fetchMessages(m.id);
        }
      }, 3000);
    } else if (match.status === "active" || match.status === "buddy") {
      pollRef.current = setInterval(async () => {
        await fetchMessages(match.id);
        await fetchMatch();
      }, 4000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [match?.status, match?.id, fetchMatch, fetchMessages]);

  useEffect(scrollToBottom, [messages]);

  async function handleFindPeer() {
    setLoading(true);
    try {
      const res = await api.post("/peers/queue");
      setMatch(res.data);
      if (res.data.status === "active" || res.data.status === "buddy") {
        await fetchMessages(res.data.id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveQueue() {
    try {
      await api.delete("/peers/queue");
      setMatch(null);
    } catch {
      /* ignore */
    }
  }

  async function handleSend() {
    if (!input.trim() || !match || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/peers/match/${match.id}/messages`, {
        message: input,
      });
      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  async function handleBuddyOpt() {
    if (!match) return;
    try {
      const res = await api.post(`/peers/match/${match.id}/buddy`);
      setMatch(res.data);
      if (res.data.status === "buddy") {
        await fetchMessages(match.id);
        const bRes = await api.get("/peers/buddies");
        setBuddies(bRes.data);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleEndMatch() {
    if (!match) return;
    try {
      await api.post(`/peers/match/${match.id}/end`);
      setMatch(null);
      setMessages([]);
    } catch {
      /* ignore */
    }
  }

  async function handleOpenBuddy(matchId: string) {
    setTab("match");
    try {
      const res = await api.get("/peers/match");
      if (res.data && res.data.id === matchId) {
        setMatch(res.data);
        await fetchMessages(matchId);
        return;
      }
    } catch {
      /* ignore */
    }
    try {
      const msgRes = await api.get(`/peers/match/${matchId}/messages`);
      setMessages(msgRes.data);
      setMatch({
        id: matchId,
        status: "buddy",
        my_buddy_opt: true,
        peer_buddy_opt: true,
        peer_name: buddies.find((b) => b.match_id === matchId)?.buddy_name ?? "Buddy",
        created_at: "",
      });
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="page peer-page">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page peer-page">
      <header className="page-header">
        <h2>Peer Match</h2>
        <p>Connect anonymously with someone who understands</p>
        <div className="peer-tabs">
          <button
            className={`peer-tab ${tab === "match" ? "active" : ""}`}
            onClick={() => setTab("match")}
          >
            Chat
          </button>
          <button
            className={`peer-tab ${tab === "buddies" ? "active" : ""}`}
            onClick={() => setTab("buddies")}
          >
            Buddies {buddies.length > 0 && `(${buddies.length})`}
          </button>
        </div>
      </header>

      {tab === "buddies" && (
        <div className="buddy-list">
          {buddies.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>
              No buddies yet. Match with a peer and opt in to become buddies!
            </p>
          )}
          {buddies.map((b) => (
            <div key={b.match_id} className="buddy-card" onClick={() => handleOpenBuddy(b.match_id)}>
              <span className="buddy-avatar">🤝</span>
              <div>
                <strong>{b.buddy_name}</strong>
                <span className="buddy-since">
                  Buddies since {new Date(b.since).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "match" && !match && (
        <div className="peer-empty">
          <div className="peer-empty-icon">🤝</div>
          <h3>Find a Peer</h3>
          <p>
            Get matched randomly with another user for an anonymous
            conversation. No names shown until you both choose to become
            buddies.
          </p>
          <button className="btn-primary btn-lg" onClick={handleFindPeer}>
            Find a Peer
          </button>
        </div>
      )}

      {tab === "match" && match?.status === "waiting" && (
        <div className="peer-waiting">
          <div className="peer-pulse" />
          <h3>Looking for a peer...</h3>
          <p>Hang tight! You'll be matched as soon as someone else joins.</p>
          <button className="btn-secondary" onClick={handleLeaveQueue}>
            Cancel
          </button>
        </div>
      )}

      {tab === "match" &&
        match &&
        (match.status === "active" || match.status === "buddy") && (
          <div className="peer-chat-container">
            <div className="peer-chat-header">
              <div className="peer-chat-info">
                <span className="peer-chat-name">{match.peer_name}</span>
                {match.status === "buddy" && (
                  <span className="buddy-badge">Buddy</span>
                )}
              </div>
              <div className="peer-chat-actions">
                {match.status === "active" && !match.my_buddy_opt && (
                  <button className="btn-buddy" onClick={handleBuddyOpt}>
                    Become Buddies
                  </button>
                )}
                {match.status === "active" && match.my_buddy_opt && (
                  <span className="buddy-pending">
                    Waiting for peer to accept...
                  </span>
                )}
                <button className="btn-end" onClick={handleEndMatch}>
                  End Chat
                </button>
              </div>
            </div>

            <div className="peer-messages">
              {messages.length === 0 && (
                <p className="peer-messages-empty">
                  Say hi to your peer! Your identity stays anonymous.
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`peer-msg ${msg.is_me ? "mine" : "theirs"}`}
                >
                  <span className="peer-msg-name">{msg.sender_name}</span>
                  <span className="peer-msg-text">{msg.message}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="peer-input-area">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <button
                className="btn-primary"
                disabled={!input.trim() || sending}
                onClick={handleSend}
              >
                Send
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
