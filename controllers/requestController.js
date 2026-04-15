import { validationResult } from 'express-validator';
import AccessRequest from '../models/AccessRequest.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import sendEmail from '../utils/sendEmail.js';
import axios from 'axios';
import PDFDocument from 'pdfkit';

// ─── Risk Prediction via ML Service ───────────────────────────────────────────
async function getPredictedRisk(data) {
    try {
        const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
        const response = await axios.post(`${ML_URL}/predict`, data, { timeout: 3000 });
        return response.data;
    } catch {
        // ML service not running – fallback scoring
        const weights = { ADMIN: 3, FULL: 3, WRITE: 2, READ: 1 };
        const typeScore = weights[data.accessType] || 1;
        const durationScore = data.expiryDays > 30 ? 2 : 1;
        const total = typeScore + durationScore;
        const riskScore = Math.min(100, total * 16);
        const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
        return { riskScore, riskLevel };
    }
}

// @desc    Create new access request
// @route   POST /api/requests
// @access  Private (REQUESTER only)
export const createAccessRequest = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { resourceName, accessType, reason, priority, expiryDays, department } = req.body;

        const existingPendingRequest = await AccessRequest.findOne({
            requester: req.user._id,
            status: 'PENDING'
        });

        if (existingPendingRequest) {
            return res.status(400).json({
                message: 'You already have a pending access request. Please wait for it to be processed.',
                existingRequest: {
                    _id: existingPendingRequest._id,
                    resourceName: existingPendingRequest.resourceName,
                    accessType: existingPendingRequest.accessType,
                    createdAt: existingPendingRequest.createdAt
                }
            });
        }

        // ML Risk Prediction
        const riskData = await getPredictedRisk({
            resourceType: resourceName,
            accessType: accessType,
            department: department || req.user.department || 'General',
            expiryDays: expiryDays || 30,
            requestHour: new Date().getHours(),
            userRole: req.user.role
        });

        // ================= AI RECOMMENDATION =================

        // ================= AI RECOMMENDATION LOGIC =================

        let recommendation;
        let confidence;

        if (riskData.riskLevel === "LOW") {

            recommendation = "Safe to Approve";
            confidence = 90;

        }
        else if (riskData.riskLevel === "MEDIUM") {

            recommendation = "Needs Review";
            confidence = 75;

        }
        else if (riskData.riskLevel === "HIGH") {

            recommendation = "Manual Review Required";
            confidence = 85;

        }
        else {

            recommendation = "Needs Manual Review";
            confidence = 70;

        }
        // ================= CREATE REQUEST =================

        const accessRequest = await AccessRequest.create({
            requester: req.user._id,
            requesterName: req.user.username,
            resourceName,
            accessType,
            reason,
            priority: priority || 'MEDIUM',
            expiryDays: expiryDays || null,
            department: department || req.user.department || 'General',

            riskScore: riskData.riskScore,
            riskLevel: riskData.riskLevel,
            aiScore: req.body.aiScore || null,

            recommendation,
            confidence
        });


        // ================= ANOMALY DETECTION =================

        const oneHourAgo =
            new Date(
                Date.now() - 60 * 60 * 1000
            );

        const recentRequests =
            await AccessRequest.countDocuments({
                requester: req.user._id,
                createdAt: {
                    $gte: oneHourAgo
                }
            });

        if (recentRequests >= 3) {

            console.log(
                "🚨 AI ALERT: High request frequency detected"
            );

        }

        // Audit log
        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'REQUEST_CREATED',
            details: `Created access request for "${resourceName}" (${accessType}) — Risk: ${riskData.riskLevel}`,
            resourceName,
            requestId: accessRequest._id,
            ipAddress: req.ip
        });

        // Emit socket notification to approvers
        const approvers = await User.find({ role: { $in: ['APPROVER', 'ADMIN'] } });
        const notifs = approvers.map(appr => ({
            receiver_user_id: appr._id,
            sender_user_id: req.user._id,
            type: 'new',
            status: 'Pending',
            message: `New request received from ${req.user.username}`,
            icon: '🔔'
        }));
        await Notification.insertMany(notifs);

        if (req.app.get('io')) {
            // Notify all approvers/admins about the new request
            approvers.forEach(appr => {
                req.app.get('io')
                    .to(appr._id.toString())
                    .emit('new-request', {
                        requestId: accessRequest._id,
                        requesterName: req.user.username,
                        resourceName: accessRequest.resourceName,
                        riskLevel: riskData.riskLevel,
                        message: `New request received from ${req.user.username}`
                    });
            });
        }

        res.status(201).json({
            message: 'Access request created successfully',
            request: accessRequest,
            riskLevel: riskData.riskLevel,
            riskScore: riskData.riskScore
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all requests for the logged-in requester (with search/filter/pagination)
// @route   GET /api/requests/my-requests
// @access  Private (REQUESTER only)
export const getMyRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const riskLevel = req.query.riskLevel || '';

        const query = { requester: req.user._id };
        if (status) query.status = status;
        if (riskLevel) query.riskLevel = riskLevel;
        if (search) query.resourceName = { $regex: search, $options: 'i' };

        const total = await AccessRequest.countDocuments(query);
        const requests = await AccessRequest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('approver', 'username email');

        res.json({ count: requests.length, total, page, totalPages: Math.ceil(total / limit), requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all access requests (for approvers) with search/filter/pagination
// @route   GET /api/requests/all
// @access  Private (APPROVER, ADMIN)
export const getAllRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const riskLevel = req.query.riskLevel || '';
        const department = req.query.department || '';

        const query = {};
        if (status) query.status = status;
        if (riskLevel) query.riskLevel = riskLevel;
        if (department) query.department = { $regex: department, $options: 'i' };
        if (search) {
            query.$or = [
                { resourceName: { $regex: search, $options: 'i' } },
                { requesterName: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await AccessRequest.countDocuments(query);
        const requests = await AccessRequest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('requester', 'username email')
            .populate('approver', 'username email');

        res.json({ count: requests.length, total, page, totalPages: Math.ceil(total / limit), requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update request status (approve/reject)
// @route   PUT /api/requests/:id/status
// @access  Private (APPROVER only)
export const updateRequestStatus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { status, comments } = req.body;
        const requestId = req.params.id;

        const accessRequest = await AccessRequest.findById(requestId);
        if (!accessRequest) return res.status(404).json({ message: 'Access request not found' });

        if (accessRequest.status !== 'PENDING') {
            return res.status(400).json({
                message: `This request has already been ${accessRequest.status.toLowerCase()}`,
                currentStatus: accessRequest.status
            });
        }

        accessRequest.status = status;
        accessRequest.approver = req.user._id;
        accessRequest.approverName = req.user.username;
        accessRequest.approvalDate = new Date();
        accessRequest.comments = comments || '';

        if (status === 'APPROVED' && accessRequest.expiryDays) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + accessRequest.expiryDays);
            accessRequest.expiryDate = expDate;
        }

        await accessRequest.save();

        // Audit log
        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
            details: `${status} request for "${accessRequest.resourceName}" by ${accessRequest.requesterName}. Comments: ${comments || 'None'}`,
            resourceName: accessRequest.resourceName,
            requestId: accessRequest._id,
            ipAddress: req.ip
        });

        // Socket.io notification to the requester
        await Notification.create({
            receiver_user_id: accessRequest.requester,
            sender_user_id: req.user._id,
            type: 'update',
            status: status === 'APPROVED' ? 'Accepted' : 'Rejected',
            message: `Your request for '${accessRequest.resourceName}' has been ${status === 'APPROVED' ? 'accepted' : 'rejected'}.`,
            icon: status === 'APPROVED' ? '✅' : '❌'
        });

        if (req.app.get('io')) {
            req.app.get('io').to(accessRequest.requester.toString()).emit('request-updated', {
                requestId: accessRequest._id,
                status,
                resourceName: accessRequest.resourceName,
                message: `Your request for "${accessRequest.resourceName}" was ${status.toLowerCase()}!`,
                comments: comments || ''
            });
        }

        // Email notification
        try {
            const requester = await User.findById(accessRequest.requester);
            if (requester?.email) {
                const message = `Hello ${requester.username},\n\nYour access request for '${accessRequest.resourceName}' has been ${status}.\n\n`
                    + `Reviewed By: ${req.user.username}\nComments: ${comments || 'None'}\n`
                    + (accessRequest.expiryDate ? `\nAccess Expires On: ${accessRequest.expiryDate.toDateString()}` : '');
                await sendEmail({ email: requester.email, subject: `Access Request ${status} - ${accessRequest.resourceName}`, message });
            }
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
        }

        res.json({ message: `Access request ${status.toLowerCase()} successfully`, request: accessRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Export requests as CSV
// @route   GET /api/requests/export/csv
// @access  Private (APPROVER, ADMIN)
export const exportCSV = async (req, res) => {
    try {
        const requests = await AccessRequest.find()
            .sort({ createdAt: -1 })
            .populate('requester', 'username email')
            .lean();

        const header = ['ID', 'Requester', 'Resource', 'Access Type', 'Status', 'Risk Level', 'Risk Score', 'Priority', 'Department', 'Created At', 'Approval Date', 'Comments'];
        const rows = requests.map(r => [
            r._id,
            r.requesterName,
            r.resourceName,
            r.accessType,
            r.status,
            r.riskLevel || 'N/A',
            r.riskScore || 'N/A',
            r.priority,
            r.department || 'General',
            new Date(r.createdAt).toISOString(),
            r.approvalDate ? new Date(r.approvalDate).toISOString() : '',
            (r.comments || '').replace(/,/g, ';')
        ]);

        const csv = [header, ...rows].map(row => row.join(',')).join('\n');

        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'EXPORT_REPORT',
            details: 'Exported requests as CSV',
            ipAddress: req.ip
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=access_requests.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
};

// @desc    Export requests as PDF
// @route   GET /api/requests/export/pdf
// @access  Private (APPROVER, ADMIN)
export const exportPDF = async (req, res) => {
    try {
        const requests = await AccessRequest.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=access_requests.pdf');
        doc.pipe(res);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text('Access Request Management Report', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1.5);

        // Summary stats
        const total = requests.length;
        const approved = requests.filter(r => r.status === 'APPROVED').length;
        const rejected = requests.filter(r => r.status === 'REJECTED').length;
        const pending = requests.filter(r => r.status === 'PENDING').length;

        doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.font('Helvetica').fontSize(10);
        doc.text(`Total Requests: ${total}   |   Approved: ${approved}   |   Rejected: ${rejected}   |   Pending: ${pending}`);
        doc.moveDown(1);

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        const cols = { requester: 50, resource: 150, type: 260, status: 330, risk: 400, date: 470 };
        doc.text('Requester', cols.requester, doc.y);
        doc.text('Resource', cols.resource, doc.y - doc.currentLineHeight());
        doc.text('Type', cols.type, doc.y - doc.currentLineHeight());
        doc.text('Status', cols.status, doc.y - doc.currentLineHeight());
        doc.text('Risk', cols.risk, doc.y - doc.currentLineHeight());
        doc.text('Date', cols.date, doc.y - doc.currentLineHeight());
        doc.moveDown(0.5);
        doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9);
        requests.forEach(r => {
            if (doc.y > 750) doc.addPage();
            const y = doc.y;
            doc.text(r.requesterName || '-', cols.requester, y, { width: 90 });
            doc.text(r.resourceName || '-', cols.resource, y, { width: 100 });
            doc.text(r.accessType || '-', cols.type, y, { width: 65 });
            doc.text(r.status || '-', cols.status, y, { width: 65 });
            doc.text(r.riskLevel || 'N/A', cols.risk, y, { width: 65 });
            doc.text(new Date(r.createdAt).toLocaleDateString(), cols.date, y, { width: 85 });
            doc.moveDown(0.8);
        });

        doc.end();

        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'EXPORT_REPORT',
            details: 'Exported requests as PDF',
            ipAddress: req.ip
        });
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ message: 'PDF export failed', error: error.message });
    }
};
