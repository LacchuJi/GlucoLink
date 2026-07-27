"use client";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  badge?: number;
};

type AppSidebarProps = {
  role: "PATIENT" | "CLINICIAN";
  userName: string;
  subtitle: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onToggleMode?: () => void;
};

export function AppSidebar({
  role,
  userName,
  subtitle,
  navItems,
  activeTab,
  onTabChange,
  onToggleMode
}: AppSidebarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || (role === "PATIENT" ? "SA" : "DR");

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">G</span>
        <span>
          Gluco<span>Link</span>
        </span>
      </div>

      <div className="workspace">
        <span className="avatar">{initials}</span>
        <div>
          <b>{userName}</b>
          <small>{subtitle}</small>
        </div>
      </div>

      <nav>
        {navItems.map((item) => (
          <a
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => onTabChange(item.id)}
            style={{ cursor: "pointer" }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {Boolean(item.badge) && <i>{item.badge}</i>}
          </a>
        ))}
      </nav>

      <div className="side-bottom">
        {onToggleMode && (
          <button className="mode" onClick={onToggleMode}>
            ⇄ {role === "PATIENT" ? "Switch to Clinician Panel" : "Switch to Patient View"}
          </button>
        )}
        <p>© 2026 GlucoLink Health<br />HIPAA & ISO 27001 Certified</p>
      </div>
    </aside>
  );
}
