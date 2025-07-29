// ===================================================
// 9. HOOK PERSONALIZADO PARA PERMISOS
// src/client/hooks/usePermissions.js
// ===================================================

import { useAuth } from '../context/AuthContext.jsx';

export const usePermissions = () => {
    const { permissions } = useAuth();

    const hasPermission = (permission) => {
        return permissions.includes(permission) || permissions.includes('*');
    };

    const hasAnyPermission = (permissionList) => {
        return permissionList.some(permission => hasPermission(permission));
    };

    const hasAllPermissions = (permissionList) => {
        return permissionList.every(permission => hasPermission(permission));
    };

    return {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
    };
};