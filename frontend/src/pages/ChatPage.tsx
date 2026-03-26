import { useState, useRef, useEffect } from "react";
import axios from "axios";
import api from "../api/client";

interface Message {
  id: string;
  role: "user" | "ai";
  message: string;
  created_at: string;
  usage?: Usage;
}

interface Usage {
  is_premium: boolean;
  daily_limit: number | null;
  used_today: number;
  remaining_today: number | null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      message:
        "Hi! I'm your MankoSathi companion. I'm here to listen and support you. How are you feeling today?",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      try {
        const [historyRes, usageRes] = await Promise.all([
          api.get<Message[]>("/chat/history"),
          api.get<Usage>("/chat/usage"),
        ]);
        if (cancelled) return;

        if (historyRes.data.length > 0) {
          setMessages(historyRes.data);
        }
        setUsage(usageRes.data);
      } catch {
        if (!cancelled) {
          setError("Unable to load your chat right now.");
        }
      }
    }

    loadChat();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    if (usage && !usage.is_premium && usage.remaining_today === 0) {
      setError("You have used all 3 free AI replies for today. Upgrade to premium to continue.");
      return;
    }

    const pendingMessageId = crypto.randomUUID();
    const userMsg: Message = {
      id: pendingMessageId,
      role: "user",
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await api.post("/chat/message", { message: text });
      setMessages((prev) => [...prev, res.data]);
      setUsage(res.data.usage);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const detail = err.response.data?.detail;
        if (detail?.code === "free_limit_reached") {
          setMessages((prev) => prev.filter((msg) => msg.id !== pendingMessageId));
          setUsage(detail.usage);
          setError("You have used all 3 free AI replies for today. Upgrade to premium to continue.");
          return;
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          message: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
      setError("Sorry, something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page chat-page">
      <header className="page-header">
        <h2>AI Companion</h2>
        <p>Your safe space to talk</p>
        {usage ? (
          <p>
            {usage.is_premium
              ? "Premium active: unlimited AI replies."
              : `${usage.remaining_today} of ${usage.daily_limit} free AI replies left today.`}
          </p>
        ) : null}
        {error ? <p>{error}</p> : null}
      </header>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div className="bubble-content">{msg.message}</div>
            </div>
          ))}
          {sending && (
            <div className="chat-bubble ai">
              <div className="bubble-content typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="chat-input-area"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={sending || (!!usage && !usage.is_premium && usage.remaining_today === 0)}
          />
          <button
            type="submit"
            disabled={
              sending ||
              !input.trim() ||
              (!!usage && !usage.is_premium && usage.remaining_today === 0)
            }
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
