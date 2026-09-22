import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Sidebar State
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isMobileMenuOpen: false,
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  
  // Global Search State
  globalSearchQuery: "",
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  
  showSearchDropdown: false,
  setShowSearchDropdown: (show) => set({ showSearchDropdown: show }),
  
  searchResults: { faculty: [], students: [], sessions: [] },
  setSearchResults: (results) => set({ searchResults: results }),

  // Theme State
  isDarkMode: false, // Prep for Dark Mode feature later
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
