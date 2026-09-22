import {
  FaBell,
  FaChevronDown,
  FaHome,
  FaSignOutAlt,
  FaTint,
  FaUserCircle,
} from "react-icons/fa";

// Shared dashboard layout used by admin and donor screens.
function DashboardLayout({ activeItem = "Dashboard", children, menu, onHome, onLogout, onMenuSelect, title, user }) {
  return (
    <section className="page app-dashboard">
      <aside className="sidebar">
        <h1><FaTint /> {title}</h1>
        <nav>
          {menu.map(([item, Icon]) => (
            <button
              className={activeItem === item ? "active" : ""}
              key={item}
              onClick={() => {
                if (item === "Logout") return onLogout?.();
                if (item === "Dashboard") return onMenuSelect?.("Dashboard");
                return onMenuSelect?.(item);
              }}
              type="button"
            >
              <Icon /> {item}
            </button>
          ))}
        </nav>
      </aside>
      <div className="dashboard-main">
        <header className="topbar">
          <button aria-label="Go to home page" className="menu-button" onClick={onHome} type="button"><FaHome /></button>
          <div className="topbar-user">
            <FaBell />
            <FaUserCircle />
            <span>{user}</span>
            <FaChevronDown />
            <button className="topbar-logout" onClick={onLogout} type="button">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>
        <div className="dashboard-body">{children}</div>
      </div>
    </section>
  );
}

export default DashboardLayout;
