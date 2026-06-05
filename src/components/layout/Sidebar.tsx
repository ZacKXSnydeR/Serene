import "./sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav: string;
  setActiveNav: (id: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export function Sidebar({ isOpen, onClose, activeNav, setActiveNav, isPinned, onTogglePin }: SidebarProps) {
  // Navigation items: search completely removed as requested
  const navItems = [
    { id: "home", label: "Home", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: "library", label: "Your Library", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    )},
    { id: "playlists", label: "Playlists", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )},
    { id: "settings", label: "Settings", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  ];

  return (
    <div
      className={`absolute top-4 left-4 h-[calc(100%-32px)] w-[80px] sidebar-container ${
        (isOpen || isPinned) ? "sidebar-open" : "sidebar-closed"
      }`}
      onMouseLeave={() => {
        if (!isPinned) onClose();
      }}
    >
      {/* Logo inside Sidebar Header - Matches height h-13 (52px) */}
      <div className="sidebar-logo-container">
        <img
          src="/SerenLogo.png"
          className="sidebar-logo-img select-none pointer-events-none"
          alt="Serene Logo"
        />
      </div>

      {/* Navigation Links centered in the middle of the dock (Search removed) */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`sidebar-nav-item group ${
                isActive ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
              }`}
            >
              {/* Icon */}
              <span
                className={`sidebar-icon ${
                  isActive ? "sidebar-icon-active" : "sidebar-icon-inactive"
                }`}
              >
                {item.icon}
              </span>
            </button>
          );
        })}

        {/* Sidebar Pin Toggle Button placed with the nav items */}
        <button
          onClick={onTogglePin}
          className={`sidebar-nav-item sidebar-pin-btn group ${
            isPinned ? "sidebar-pin-btn-active" : "sidebar-nav-item-inactive"
          }`}
          title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
        >
          <span className={`sidebar-icon ${isPinned ? "sidebar-icon-active" : ""}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24z"></path>
            </svg>
          </span>
        </button>
      </nav>

      {/* Premium Profile Button always resting at the very bottom */}
      <div className="sidebar-profile-container">
        <button className="sidebar-profile-btn group" title="User Profile">
          <div className="sidebar-profile-avatar">
            <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
