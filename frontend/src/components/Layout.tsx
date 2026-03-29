import { NavLink, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/profile", label: "Profile", icon: "🪪" },
  { to: "/chat", label: "AI Chat", icon: "💬" },
  { to: "/mood", label: "Mood", icon: "📊" },
  { to: "/community", label: "Community", icon: "👥" },
  { to: "/therapists", label: "Therapists", icon: "🩺" },
  { to: "/peers", label: "Peer Match", icon: "🤝", roles: ["user"] },
  { to: "/patient-insights", label: "Patient Insights", icon: "📋", roles: ["therapist"] },
  { to: "/admin", label: "Admin Panel", icon: "⚙️", roles: ["admin"] },
];

const ROLE_COLORS: Record<UserRole, string> = {
  user: "#10b981",
  therapist: "#6366f1",
  admin: "#ef4444",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const role = (user?.role ?? "user") as UserRole;

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">MankoSathi</h1>
          <p className="tagline">Your mental wellness companion</p>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span
              className="role-badge"
              style={{ backgroundColor: ROLE_COLORS[role] + "18", color: ROLE_COLORS[role] }}
            >
              {role}
            </span>
          </div>
          <button className="btn-logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
