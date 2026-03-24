import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const quickActions = [
  {
    to: "/chat",
    title: "Talk to AI",
    description: "Share how you're feeling",
    icon: "💬",
    color: "#6366f1",
  },
  {
    to: "/mood",
    title: "Log Mood",
    description: "Track your emotions",
    icon: "📊",
    color: "#10b981",
  },
  {
    to: "/community",
    title: "Community",
    description: "Connect with others",
    icon: "👥",
    color: "#f59e0b",
  },
  {
    to: "/therapists",
    title: "Find Help",
    description: "Browse therapists",
    icon: "🩺",
    color: "#ef4444",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const greeting = getGreeting();

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <h2>
          {greeting}, {user?.name?.split(" ")[0] ?? "there"}
        </h2>
        <p>How are you feeling today?</p>
      </header>

      <div className="quick-actions">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to} className="action-card">
            <div
              className="action-icon"
              style={{ backgroundColor: action.color + "15", color: action.color }}
            >
              {action.icon}
            </div>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
