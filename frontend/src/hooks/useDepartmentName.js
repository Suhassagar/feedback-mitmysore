import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

// Global cache for departments across component mounts
let globalDeptMap = null;
let fetchPromise = null;

export const STATIC_DEPT_NAMES = {
  cse: "Computer Science & Engineering",
  cs: "Computer Science & Engineering",
  ise: "Information Science & Engineering",
  is: "Information Science & Engineering",
  aiml: "Artificial Intelligence & Machine Learning",
  ai: "Artificial Intelligence & Machine Learning",
  aids: "Artificial Intelligence & Data Science",
  ece: "Electronics & Communication Engineering",
  ec: "Electronics & Communication Engineering",
  eee: "Electrical & Electronics Engineering",
  ee: "Electrical & Electronics Engineering",
  me: "Mechanical Engineering",
  mech: "Mechanical Engineering",
  cv: "Civil Engineering",
  civil: "Civil Engineering",
  bt: "Biotechnology",
  ch: "Chemical Engineering",
  mba: "Master of Business Administration",
  mca: "Master of Computer Applications"
};

export function getDepartmentNameSync(dept_id, user) {
  if (!dept_id) return "";
  const cleanId = String(dept_id).trim().toLowerCase();

  // 1. If currently logged in user belongs to this department and has dept_name
  if (user?.dept_id && String(user.dept_id).trim().toLowerCase() === cleanId && user.dept_name) {
    return user.dept_name;
  }

  // 2. If present in global fetched cache
  if (globalDeptMap && globalDeptMap[cleanId]) {
    return globalDeptMap[cleanId];
  }

  // 3. Fallback to static dictionary or capitalized abbreviation
  return STATIC_DEPT_NAMES[cleanId] || dept_id;
}

export function useDepartmentName(dept_id) {
  const { user } = useAuth();
  const [deptName, setDeptName] = useState(() => getDepartmentNameSync(dept_id, user));

  useEffect(() => {
    if (!dept_id) {
      setDeptName("");
      return;
    }

    const cleanId = String(dept_id).trim().toLowerCase();

    // 1. Check logged-in user context
    if (user?.dept_id && String(user.dept_id).trim().toLowerCase() === cleanId && user.dept_name) {
      setDeptName(user.dept_name);
      return;
    }

    // 2. Check global cache
    if (globalDeptMap && globalDeptMap[cleanId]) {
      setDeptName(globalDeptMap[cleanId]);
      return;
    }

    // 3. Set static map while fetching
    if (STATIC_DEPT_NAMES[cleanId]) {
      setDeptName(STATIC_DEPT_NAMES[cleanId]);
    }

    // 4. Fetch dynamic list from server to capture custom departments
    if (!fetchPromise) {
      fetchPromise = apiClient.get('/departments')
        .then(res => {
          const map = {};
          if (Array.isArray(res.data)) {
            res.data.forEach(d => {
              if (d.dept_id && d.dept_name) {
                map[String(d.dept_id).trim().toLowerCase()] = d.dept_name;
              }
            });
          }
          globalDeptMap = map;
          return map;
        })
        .catch(err => {
          console.warn("Failed to fetch department roster for name lookup:", err);
          return STATIC_DEPT_NAMES;
        });
    }

    fetchPromise.then(map => {
      if (map && map[cleanId]) {
        setDeptName(map[cleanId]);
      }
    });
  }, [dept_id, user]);

  return deptName;
}

export default useDepartmentName;
