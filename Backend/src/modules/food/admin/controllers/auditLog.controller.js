import { FoodAuditLog } from '../models/auditLog.model.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getAuditLogsController(req, res, next) {
    try {
        const { orderId, riderId, adminId, action, from, to, page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (orderId) filter.orderId = orderId;
        if (riderId) filter.riderId = riderId;
        if (adminId) filter.performedBy = adminId;
        if (action) filter.action = action;
        
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        const skip = (Number(page) - 1) * Number(limit);
        
        const [logs, total] = await Promise.all([
            FoodAuditLog.find(filter)
                .populate('performedBy', 'firstName lastName email')
                .populate('riderId', 'personalInfo.firstName personalInfo.lastName phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            FoodAuditLog.countDocuments(filter)
        ]);

        return sendResponse(res, 200, 'Audit logs fetched successfully', {
            logs,
            pagination: { page: Number(page), limit: Number(limit), total }
        });
    } catch (err) {
        next(err);
    }
}

export async function getAuditLogByIdController(req, res, next) {
    try {
        const log = await FoodAuditLog.findById(req.params.id)
            .populate('performedBy', 'firstName lastName email')
            .populate('riderId', 'personalInfo.firstName personalInfo.lastName phone')
            .lean();
            
        if (!log) {
            return sendResponse(res, 404, 'Audit log not found');
        }
        
        return sendResponse(res, 200, 'Audit log details', { log });
    } catch (err) {
        next(err);
    }
}

export async function exportAuditLogsController(req, res, next) {
    try {
        const { from, to, action } = req.query;
        const filter = {};
        if (action) filter.action = action;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }
        
        const logs = await FoodAuditLog.find(filter)
            .populate('performedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean();
            
        // Convert to simple CSV format
        const headers = ['Date', 'Action', 'Admin', 'Order ID', 'Rider ID', 'Incentive Amount', 'Reason'];
        const csvRows = [headers.join(',')];
        
        for (const log of logs) {
            const adminName = log.performedBy ? `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim() : 'System';
            csvRows.push([
                log.createdAt.toISOString(),
                log.action,
                `"${adminName}"`,
                log.orderId || '',
                log.riderId || '',
                log.incentiveAmount || 0,
                `"${(log.reason || '').replace(/"/g, '""')}"`
            ].join(','));
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        return res.status(200).send(csvRows.join('\n'));
    } catch (err) {
        next(err);
    }
}
