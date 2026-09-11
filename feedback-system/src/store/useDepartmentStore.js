import { create } from 'zustand';
import apiClient from '../services/apiClient';

export const useDepartmentStore = create((set, get) => ({
  // Notification / Registration State
  pendingRegistrations: [],
  setPendingRegistrations: (regs) => set({ pendingRegistrations: regs }),
  
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),

  // Actions
  loadPendingRegistrations: async (dept_id) => {
    try {
      const res = await apiClient.get(`/faculty/pending/${dept_id}`);
      set({ pendingRegistrations: res.data });
    } catch (err) {
      console.error("Error loading pending registrations:", err);
    }
  },

  approveFaculty: async (faculty_id, dept_id) => {
    try {
      const res = await apiClient.post('/faculty/approve', { faculty_id });
      if (res.data.success) {
        // Optimistic UI update
        const currentPending = get().pendingRegistrations;
        set({ pendingRegistrations: currentPending.filter(f => f.faculty_id !== faculty_id) });
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: "Error approving faculty." };
    }
  },

  rejectFaculty: async (faculty_id, dept_id) => {
    try {
      const res = await apiClient.post('/faculty/reject', { faculty_id });
      if (res.data.success) {
        const currentPending = get().pendingRegistrations;
        set({ pendingRegistrations: currentPending.filter(f => f.faculty_id !== faculty_id) });
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: "Error rejecting faculty." };
    }
  }
}));
