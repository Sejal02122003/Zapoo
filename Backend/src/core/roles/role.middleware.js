import { sendError } from '../../utils/response.js';

export const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return sendError(res, 401, 'Not authenticated');
        }

        const userRole = String(req.user.role).toUpperCase();
        const allowedSet = new Set(allowedRoles.map((r) => String(r).toUpperCase()));
        if (!allowedSet.has(userRole)) {
            return sendError(res, 403, 'Forbidden: insufficient permissions');
        }

        next();
    };
};

export const requireOutletPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, 'Not authenticated');
        }

        // If user is Admin or Owner, full permission granted
        if (
            req.user.isOwner ||
            req.user.ownerRole === 'OWNER' ||
            req.user.role === 'ADMIN' ||
            req.user.role === 'SUPER_ADMIN' ||
            !req.user.outletId
        ) {
            return next();
        }

        const permissions = req.user.permissions || [];
        if (permissions.includes('*') || permissions.includes(permission)) {
            return next();
        }

        return sendError(res, 403, `Forbidden: requires permission ${permission}`);
    };
};

