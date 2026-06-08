import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isSidebarPinned: boolean;
  isNowPlayingOpen: boolean;
  isFullscreenOpen: boolean;
  isSearchActive: boolean;
  isTitlebarHovered: boolean;
  discordRpcEnabled: boolean;
  
  // Actions
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsSidebarPinned: (isPinned: boolean) => void;
  setIsNowPlayingOpen: (isOpen: boolean) => void;
  setIsFullscreenOpen: (isOpen: boolean) => void;
  setIsSearchActive: (isActive: boolean) => void;
  setIsTitlebarHovered: (isHovered: boolean) => void;
  setDiscordRpcEnabled: (enabled: boolean) => void;
  toggleSidebarPin: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isSidebarPinned: false, // In components, we'll initialize this from localStorage
  isNowPlayingOpen: false,
  isFullscreenOpen: false,
  isSearchActive: false,
  isTitlebarHovered: false,
  discordRpcEnabled: localStorage.getItem('discord_rpc_enabled') !== 'false', // Default true

  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setIsSidebarPinned: (isPinned) => {
    localStorage.setItem("sidebar_pinned", String(isPinned));
    set({ isSidebarPinned: isPinned, isSidebarOpen: isPinned });
  },
  setIsNowPlayingOpen: (isOpen) => set({ isNowPlayingOpen: isOpen }),
  setIsFullscreenOpen: (isOpen) => set({ isFullscreenOpen: isOpen }),
  setIsSearchActive: (isActive) => set({ isSearchActive: isActive }),
  setIsTitlebarHovered: (isHovered) => set({ isTitlebarHovered: isHovered }),
  setDiscordRpcEnabled: (enabled) => {
    localStorage.setItem('discord_rpc_enabled', String(enabled));
    set({ discordRpcEnabled: enabled });
  },
  
  toggleSidebarPin: () => set((state) => {
    const newPinned = !state.isSidebarPinned;
    localStorage.setItem("sidebar_pinned", String(newPinned));
    return { isSidebarPinned: newPinned, isSidebarOpen: newPinned };
  }),
}));
