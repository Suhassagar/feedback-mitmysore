import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";

export function useAnalytics(dept_id) {
  const [analytics, setAnalytics] = useState({
    avgRating: "0.0",
    totalSubmitted: 0,
    totalStudents: 0,
    trendData: []
  });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!dept_id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/analytics/department/${dept_id}`, { withCredentials: true });
      setAnalytics(res.data);
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast.error("Failed to load department analytics");
    } finally {
      setLoading(false);
    }
  }, [dept_id]);

  useEffect(() => {
    loadAnalytics();
    window.addEventListener("NEW_FEEDBACK_RECEIVED", loadAnalytics);
    return () => window.removeEventListener("NEW_FEEDBACK_RECEIVED", loadAnalytics);
  }, [loadAnalytics]);

  return { analytics, loadAnalytics, loading };
}
