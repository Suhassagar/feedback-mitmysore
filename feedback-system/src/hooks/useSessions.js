import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";

export function useSessions(dept_id) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!dept_id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/get-sessions?dept=${dept_id}`, { withCredentials: true });
      setSessions(res.data);
    } catch (err) {
      console.error("Error loading sessions:", err);
      toast.error("Failed to load sessions data");
    } finally {
      setLoading(false);
    }
  }, [dept_id]);

  useEffect(() => {
    loadSessions();
    window.addEventListener("NEW_FEEDBACK_RECEIVED", loadSessions);
    return () => window.removeEventListener("NEW_FEEDBACK_RECEIVED", loadSessions);
  }, [loadSessions]);

  return { sessions, loadSessions, loading };
}
