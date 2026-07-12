// src/hooks/usePermissions.js
import { useAuth } from "../AuthContext";

/**
 * Returns helper functions to check dynamic permissions for the current user.
 */
export function usePermissions() {
  const { user } = useAuth();

  const check = (moduleName, action = 'view') => {
    if (!user) return false;

    // Super Admin has absolute bypass unless explicitly restricted?
    // Usually Super Admin is the god role.
    if (user.role === 'SUPER_ADMIN') return true;

    const perms = user.permissions?.[moduleName];
    if (!perms) return false;

    return !!perms[action.toLowerCase()];
  };

  return { check };
}
