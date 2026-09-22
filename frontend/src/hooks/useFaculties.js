import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";

export function useFaculties(dept_id) {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFaculties = useCallback(async () => {
    if (!dept_id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/faculty/by-dept/${dept_id}`, { withCredentials: true });
      const facs = res.data;
      
      const facsWithRatings = await Promise.all(facs.map(async (f) => {
        try {
          const r = await apiClient.get(`/feedback/subjects_with_avg/${f.faculty_id}`, { withCredentials: true });
          const subjects = r.data;
          if (subjects.length > 0) {
            const avg = subjects.reduce((acc, curr) => acc + parseFloat(curr.avg_rating), 0) / subjects.length;
            return { ...f, avgRating: avg.toFixed(1) };
          }
          return { ...f, avgRating: "N/A" };
        } catch(err) {
          return { ...f, avgRating: "N/A" };
        }
      }));
      
      facsWithRatings.sort((a, b) => {
        if (a.avgRating === "N/A") return 1;
        if (b.avgRating === "N/A") return -1;
        return parseFloat(b.avgRating) - parseFloat(a.avgRating);
      });
      
      setFaculties(facsWithRatings);
    } catch (err) {
      console.error("Error fetching faculties:", err);
      toast.error("Failed to load faculty data");
    } finally {
      setLoading(false);
    }
  }, [dept_id]);

  useEffect(() => {
    loadFaculties();
    window.addEventListener("NEW_FEEDBACK_RECEIVED", loadFaculties);
    return () => window.removeEventListener("NEW_FEEDBACK_RECEIVED", loadFaculties);
  }, [loadFaculties]);

  return { faculties, loadFaculties, loading };
}
