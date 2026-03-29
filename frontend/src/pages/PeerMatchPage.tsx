import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

interface SearchResult {
  id: string;
  display_name: string;
  bio: string;
  health_status: string;
  friendship_status:
    | "self"
    | "friends"
    | "none"
    | "incoming_request"
    | "outgoing_request";
  pending_request_id: string | null;
}

export default function PeerMatchPage() {
  const suggestedTags = [
    "anxiety",
    "depression",
    "stress",
    "insomnia",
    "cancer",
    "schizophrenia",
    "burnout",
    "grief",
  ];
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [messages, setMessages] = useState<PeerMsg[]>([]);
  const [input, setInput] = useState("");
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"match" | "buddies">("buddies");
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

  async function handleSearchFriends() {
    if (searchTags.length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get("/friends/search", {
        params: { q: searchTags.join(",") },
      });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addSearchTag(rawTag: string) {
    const tag = rawTag.trim().toLowerCase();
    if (!tag || searchTags.includes(tag)) return;
    setSearchTags((prev) => [...prev, tag]);
    setSearchInput("");
  }

  function removeSearchTag(tagToRemove: string) {
    setSearchTags((prev) => prev.filter((tag) => tag !== tagToRemove));
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
            className={`peer-tab ${tab === "buddies" ? "active" : ""}`}
            onClick={() => setTab("buddies")}
          >
            Buddies {buddies.length > 0 && `(${buddies.length})`}
          </button>
          <button
            className={`peer-tab ${tab === "match" ? "active" : ""}`}
            onClick={() => setTab("match")}
          >
            Chat
          </button>
        </div>
      </header>

      {tab === "buddies" && (
        <>
          <div className="profile-card peer-search-panel">
            <h3>Search by Health Status Tags</h3>
            <p style={{ color: "var(--text-muted)" }}>
              Add one or more tags to find users with similar health-related experiences.
            </p>
            <div className="peer-tag-search">
              <div className="peer-tag-input-wrap">
                {searchTags.length > 0 && (
                  <div className="peer-tag-list">
                    {searchTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="peer-tag"
                        onClick={() => removeSearchTag(tag)}
                      >
                        #{tag} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="comment-form">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Type a tag and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchInput.trim()) {
                        addSearchTag(searchInput);
                      } else {
                        handleSearchFriends();
                      }
                    }
                    if (e.key === "," && searchInput.trim()) {
                      e.preventDefault();
                      addSearchTag(searchInput);
                    }
                    if (e.key === "Backspace" && !searchInput && searchTags.length > 0) {
                      removeSearchTag(searchTags[searchTags.length - 1]);
                    }
                  }}
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleSearchFriends}
                  disabled={searching || searchTags.length === 0}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            <div className="peer-tag-suggestions">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`peer-tag-suggestion ${searchTags.includes(tag) ? "active" : ""}`}
                  onClick={() => addSearchTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>

            {searchTags.length > 0 && (
              <p className="profile-empty">
                Searching for: {searchTags.map((tag) => `#${tag}`).join(", ")}
              </p>
            )}

            {searchTags.length > 0 && searchResults.length === 0 && !searching && (
              <p className="profile-empty">No users matched those tags yet.</p>
            )}

            {searchResults.length > 0 && (
              <div className="profile-request-list">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="profile-request-item peer-search-card"
                    onClick={() => navigate(`/users/${result.id}`)}
                  >
                    <div>
                      <strong>{result.display_name}</strong>
                      <span className="peer-search-status">
                        {result.health_status || "No health status shared yet."}
                      </span>
                      <p>{result.bio || "No bio shared yet."}</p>
                    </div>
                    <span className="profile-badge">
                      {result.friendship_status === "friends"
                        ? "Friends"
                        : result.friendship_status === "outgoing_request"
                          ? "Request sent"
                          : result.friendship_status === "incoming_request"
                            ? "Requested you"
                            : "View profile"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </>
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
