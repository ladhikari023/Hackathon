import { useState, useEffect } from "react";
import api from "../api/client";

interface Stats {
  total_users: number;
  total_posts: number;
  total_mood_logs: number;
  total_chat_messages: number;
  users_by_role: Record<string, number>;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  provider: string;
  created_at: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    api.get("/admin/stats").then((res) => setStats(res.data));
    api.get("/admin/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h2>Admin Panel</h2>
        <p>Platform overview and user management</p>
      </header>

      {stats && (
        <div className="stats-grid">
          <StatCard label="Users" value={stats.total_users} color="#6366f1" />
          <StatCard label="Posts" value={stats.total_posts} color="#10b981" />
          <StatCard label="Mood Logs" value={stats.total_mood_logs} color="#f59e0b" />
          <StatCard label="Chat Messages" value={stats.total_chat_messages} color="#ef4444" />
        </div>
      )}

      {stats?.users_by_role && (
        <div className="admin-section">
          <h3>Users by Role</h3>
          <div className="role-breakdown">
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} className="role-item">
                <span className="role-name">{role}</span>
                <span className="role-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-section">
        <h3>All Users</h3>
        <div className="user-table">
          {users.map((u) => (
            <div key={u.id} className="user-row">
              <div className="user-row-main">
                <span className="user-row-name">{u.name}</span>
                <span className="user-row-role" data-role={u.role}>{u.role}</span>
              </div>
              <div className="user-row-meta">
                <span>{u.email}</span>
                <span>{u.provider}</span>
                <span>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
