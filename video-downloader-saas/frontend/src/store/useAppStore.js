import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Main app store với Zustand
const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme state
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),

      // User preferences
      preferences: {
        language: 'vi',
        autoDownload: false,
        defaultQuality: '720p',
        notifications: true,
      },
      setPreferences: (preferences) => set({ preferences }),
      updatePreference: (key, value) => set((state) => ({
        preferences: { ...state.preferences, [key]: value }
      })),

      // Download state
      downloads: [],
      activeDownloads: [],
      addDownload: (download) => set((state) => ({
        downloads: [download, ...state.downloads],
        activeDownloads: [...state.activeDownloads, download]
      })),
      updateDownload: (id, updates) => set((state) => ({
        downloads: state.downloads.map(d => 
          d.id === id ? { ...d, ...updates } : d
        ),
        activeDownloads: state.activeDownloads.map(d => 
          d.id === id ? { ...d, ...updates } : d
        )
      })),
      removeActiveDownload: (id) => set((state) => ({
        activeDownloads: state.activeDownloads.filter(d => d.id !== id)
      })),
      clearDownloads: () => set({ downloads: [], activeDownloads: [] }),

      // UI state
      ui: {
        sidebarOpen: false,
        modalOpen: null, // 'login', 'register', 'payment', etc.
        loading: false,
        notifications: [],
      },
      setUI: (updates) => set((state) => ({
        ui: { ...state.ui, ...updates }
      })),
      openModal: (modalType) => set((state) => ({
        ui: { ...state.ui, modalOpen: modalType }
      })),
      closeModal: () => set((state) => ({
        ui: { ...state.ui, modalOpen: null }
      })),
      addNotification: (notification) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, {
            id: Date.now(),
            timestamp: new Date(),
            ...notification
          }]
        }
      })),
      removeNotification: (id) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== id)
        }
      })),

      // Analytics state
      analytics: {
        pageViews: 0,
        downloadsCount: 0,
        lastVisit: null,
      },
      updateAnalytics: (updates) => set((state) => ({
        analytics: { ...state.analytics, ...updates }
      })),
      incrementPageViews: () => set((state) => ({
        analytics: { 
          ...state.analytics, 
          pageViews: state.analytics.pageViews + 1,
          lastVisit: new Date()
        }
      })),
      incrementDownloads: () => set((state) => ({
        analytics: { 
          ...state.analytics, 
          downloadsCount: state.analytics.downloadsCount + 1
        }
      })),

      // Reset functions
      resetStore: () => set({
        downloads: [],
        activeDownloads: [],
        ui: {
          sidebarOpen: false,
          modalOpen: null,
          loading: false,
          notifications: [],
        },
        analytics: {
          pageViews: 0,
          downloadsCount: 0,
          lastVisit: null,
        }
      }),
    }),
    {
      name: 'video-downloader-storage',
      partialize: (state) => ({
        theme: state.theme,
        preferences: state.preferences,
        analytics: state.analytics,
        // Không persist UI state và downloads (sensitive data)
      }),
    }
  )
);

export default useAppStore;
