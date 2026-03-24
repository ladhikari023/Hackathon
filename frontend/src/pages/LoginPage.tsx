import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface DemoAccount {
  key: string;
  name: string;
  icon: string;
}

interface AccountGroup {
  label: string;
  accounts: DemoAccount[];
}

const ACCOUNT_GROUPS: AccountGroup[] = [
  {
    label: "Users",
    accounts: [
      { key: "ram", name: "Ram Sharma", icon: "👤" },
      { key: "ananya", name: "Ananya Thapa", icon: "👩" },
      { key: "sita", name: "Sita Gurung", icon: "👧" },
    ],
  },
  {
    label: "Therapists",
    accounts: [
      { key: "dr-sharma", name: "Dr. Sharma", icon: "🩺" },
      { key: "dr-patel", name: "Dr. Patel", icon: "🩺" },
    ],
  },
  {
    label: "Admin",
    accounts: [{ key: "admin", name: "Admin", icon: "🔑" }],
  },
];

export default function LoginPage() {
  const { loginAsDemo, user } = useAuth();
  const navigate = useNavigate();
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleLogin(key: string) {
    setLoggingIn(key);
    try {
      await loginAsDemo(key);
      navigate("/");
    } finally {
      setLoggingIn(null);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>MankoSathi</h1>
          <p>Your safe space for mental wellness</p>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span>💬</span>
            <span>AI companion that listens</span>
          </div>
          <div className="feature-item">
            <span>📊</span>
            <span>Track your emotional journey</span>
          </div>
          <div className="feature-item">
            <span>👥</span>
            <span>Connect with your community</span>
          </div>
        </div>

        <div className="login-actions">
          <p className="demo-heading">Choose an account to explore</p>

          {ACCOUNT_GROUPS.map((group) => (
            <div key={group.label} className="account-group">
              <span className="account-group-label">{group.label}</span>
              <div className="account-group-buttons">
                {group.accounts.map((acct) => (
                  <button
                    key={acct.key}
                    className="btn-account"
                    disabled={loggingIn !== null}
                    onClick={() => handleLogin(acct.key)}
                  >
                    <span className="account-icon">{acct.icon}</span>
                    <span className="account-name">
                      {loggingIn === acct.key ? "Signing in..." : acct.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
