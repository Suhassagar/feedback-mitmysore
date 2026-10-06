import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

// Global cache for department profiles across component mounts
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

export function invalidateDepartmentCache() {
  globalDeptMap = null;
  fetchPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('departmentBrandingUpdated'));
  }
}

export function getDepartmentNameSync(dept_id, user) {
  if (!dept_id) return "";
  const cleanId = String(dept_id).trim().toLowerCase();

  // 1. If currently logged in user belongs to this department and has dept_name
  if (user?.dept_id && String(user.dept_id).trim().toLowerCase() === cleanId && user.dept_name) {
    return user.dept_name;
  }

  // 2. If present in global fetched cache
  if (globalDeptMap && globalDeptMap[cleanId]) {
    return globalDeptMap[cleanId].dept_name;
  }

  // 3. Fallback to static dictionary or capitalized abbreviation
  return STATIC_DEPT_NAMES[cleanId] || dept_id;
}

export function useDepartmentProfile(dept_id) {
  const { user } = useAuth();
  const cleanId = String(dept_id || '').trim().toLowerCase();

  const getProfileData = useCallback(() => {
    // 1. Match logged in user if applicable
    if (user?.dept_id && String(user.dept_id).trim().toLowerCase() === cleanId) {
      return {
        dept_id: user.dept_id,
        dept_name: user.dept_name || STATIC_DEPT_NAMES[cleanId] || user.dept_id,
        logo_url: user.logo_url || null,
        brand_color: user.brand_color || '#2563EB',
        brand_accent: user.brand_accent || '#1E40AF',
        logo_lqip: user.logo_lqip || null
      };
    }

    // 2. Check cached roster
    if (globalDeptMap && globalDeptMap[cleanId]) {
      return globalDeptMap[cleanId];
    }

    // 3. Fallback skeleton
    return {
      dept_id,
      dept_name: STATIC_DEPT_NAMES[cleanId] || dept_id || '',
      logo_url: null,
      brand_color: '#2563EB',
      brand_accent: '#1E40AF',
      logo_lqip: null
    };
  }, [cleanId, dept_id, user]);

  const [profile, setProfile] = useState(getProfileData);

  useEffect(() => {
    setProfile(getProfileData());

    const loadData = () => {
      if (!fetchPromise) {
        fetchPromise = apiClient.get('/departments')
          .then(res => {
            const map = {};
            if (Array.isArray(res.data)) {
              res.data.forEach(d => {
                if (d.dept_id) {
                  const key = String(d.dept_id).trim().toLowerCase();
                  map[key] = {
                    dept_id: d.dept_id,
                    dept_name: d.dept_name,
                    logo_url: d.logo_url || null,
                    brand_color: d.brand_color || '#2563EB',
                    brand_accent: d.brand_accent || '#1E40AF',
                    logo_lqip: d.logo_lqip || null
                  };
                }
              });
            }
            globalDeptMap = map;
            return map;
          })
          .catch(err => {
            console.warn("Failed to fetch department roster:", err);
            return {};
          });
      }

      fetchPromise.then(map => {
        if (map && map[cleanId]) {
          setProfile(map[cleanId]);
        }
      });
    };

    loadData();

    const handleUpdate = () => {
      fetchPromise = null;
      loadData();
    };

    window.addEventListener('departmentBrandingUpdated', handleUpdate);
    return () => window.removeEventListener('departmentBrandingUpdated', handleUpdate);
  }, [cleanId, getProfileData]);

  return profile;
}

export function useDepartmentName(dept_id) {
  const profile = useDepartmentProfile(dept_id);
  return profile.dept_name || dept_id;
}

export default useDepartmentName;
