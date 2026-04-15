import AuditLog from '../models/AuditLog.js';

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private (ADMIN only)
export const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const action = req.query.action || '';
        const search = req.query.search || '';

        const query = {};
        if (action) query.action = action;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { details: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'username email role')
            .lean();

        res.json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
    }
};
