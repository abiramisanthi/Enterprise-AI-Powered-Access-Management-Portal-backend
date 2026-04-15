import AccessRequest from '../models/AccessRequest.js';
import User from '../models/User.js';

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private (APPROVER, ADMIN)
export const getAnalytics = async (req, res) => {
    try {

        const totalRequests =
            await AccessRequest.countDocuments();

        const approved =
            await AccessRequest.countDocuments({
                status: 'APPROVED'
            });

        const rejected =
            await AccessRequest.countDocuments({
                status: 'REJECTED'
            });

        const pending =
            await AccessRequest.countDocuments({
                status: 'PENDING'
            });

        const approvalRate =
            totalRequests > 0
                ? ((approved / totalRequests) * 100).toFixed(1)
                : 0;

        // ── Average decision time ─────────────────────────

        const decided =
            await AccessRequest.find({
                status: {
                    $in: ['APPROVED', 'REJECTED']
                },
                approvalDate: {
                    $ne: null
                }
            }).select(
                'createdAt approvalDate'
            );

        let avgDecisionTime = 0;

        if (decided.length > 0) {

            const totalMs =
                decided.reduce(
                    (sum, r) =>
                        sum +
                        (
                            new Date(r.approvalDate)
                            -
                            new Date(r.createdAt)
                        ),
                    0
                );

            avgDecisionTime =
                (
                    totalMs
                    /
                    decided.length
                    /
                    (1000 * 60 * 60)
                ).toFixed(1);

        }

        // ── Top requested resources ───────────────────────

        const topResources =
            await AccessRequest.aggregate([
                {
                    $group: {
                        _id: '$resourceName',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 5
                }
            ]);

        // ── Requests by month ─────────────────────────────

        const sixMonthsAgo = new Date();

        sixMonthsAgo.setMonth(
            sixMonthsAgo.getMonth() - 6
        );

        const byMonth =
            await AccessRequest.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: sixMonthsAgo
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: {
                                $year: '$createdAt'
                            },
                            month: {
                                $month: '$createdAt'
                            }
                        },
                        total: {
                            $sum: 1
                        },
                        approved: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'APPROVED'
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        rejected: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'REJECTED'
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        '_id.year': 1,
                        '_id.month': 1
                    }
                }
            ]);

        // ── Requests by access type ───────────────────────

        const byAccessType =
            await AccessRequest.aggregate([
                {
                    $group: {
                        _id: '$accessType',
                        count: {
                            $sum: 1
                        }
                    }
                }
            ]);

        // ── FIX: Risk Distribution ────────────────────────

        const riskAgg =
            await AccessRequest.aggregate([
                {
                    $group: {
                        _id: '$riskLevel',
                        count: {
                            $sum: 1
                        }
                    }
                }
            ]);

        const riskDistribution = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0
        };

        riskAgg.forEach(item => {

            if (item._id) {

                riskDistribution[
                    item._id
                ] = item.count;

            }

        });

        // ── Recent activity ───────────────────────────────

        const recentActivity =
            await AccessRequest.find()
                .sort({
                    createdAt: -1
                })
                .limit(10)
                .select(
                    'resourceName status createdAt riskLevel riskScore requesterName'
                )
                .lean();

        // ── Response ──────────────────────────────────────

        res.json({

            summary: {
                totalRequests,
                approved,
                rejected,
                pending,
                approvalRate:
                    parseFloat(
                        approvalRate
                    ),
                avgDecisionTime:
                    parseFloat(
                        avgDecisionTime
                    )
            },

            topResources,

            byMonth,

            byAccessType,

            riskDistribution,

            recentActivity

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            message: 'Analytics failed',
            error: error.message
        });

    }

};