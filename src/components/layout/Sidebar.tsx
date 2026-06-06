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
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    )},
    { id: "playlists", label: "Playlists", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 6H3M12 18H3" />
      </svg>
    )},
    { id: "liked", label: "Liked Songs", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.566z" />
      </svg>
    )},
    { id: "history", label: "History", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              data-tooltip={item.label}
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
          data-tooltip={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
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
        <button 
          className={`sidebar-profile-btn group ${activeNav === 'profile' ? 'bg-white/10 text-white' : ''}`} 
          data-tooltip="User Profile"
          onClick={() => setActiveNav('profile')}
        >
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
