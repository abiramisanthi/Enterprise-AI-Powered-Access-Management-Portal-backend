import { validationResult } from 'express-validator';
import AccessRequest from '../models/AccessRequest.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Create new access request
// @route   POST /api/requests
// @access  Private (REQUESTER only)
export const createAccessRequest = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { resourceName, accessType, reason, priority, expiryDays } = req.body;

        // CRITICAL BUSINESS RULE: Check if user already has a pending request
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

        // Create new access request
        const accessRequest = await AccessRequest.create({
            requester: req.user._id,
            requesterName: req.user.username,
            resourceName,
            accessType,
            reason,
            priority: priority || 'MEDIUM',
            expiryDays: expiryDays || null
        });

        res.status(201).json({
            message: 'Access request created successfully',
            request: accessRequest
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all requests for the logged-in requester
// @route   GET /api/requests/my-requests
// @access  Private (REQUESTER only)
export const getMyRequests = async (req, res) => {
    try {
        const requests = await AccessRequest.find({ requester: req.user._id })
            .sort({ createdAt: -1 })
            .populate('approver', 'username email');

        res.json({
            count: requests.length,
            requests
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all access requests (for approvers)
// @route   GET /api/requests/all
// @access  Private (APPROVER only)
export const getAllRequests = async (req, res) => {
    try {
        const requests = await AccessRequest.find()
            .sort({ createdAt: -1 })
            .populate('requester', 'username email')
            .populate('approver', 'username email');

        res.json({
            count: requests.length,
            requests
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update request status (approve/reject)
// @route   PUT /api/requests/:id/status
// @access  Private (APPROVER only)
export const updateRequestStatus = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { status, comments } = req.body;
        const requestId = req.params.id;

        // Find the request
        const accessRequest = await AccessRequest.findById(requestId);

        if (!accessRequest) {
            return res.status(404).json({ message: 'Access request not found' });
        }

        // Check if request is already processed
        if (accessRequest.status !== 'PENDING') {
            return res.status(400).json({
                message: `This request has already been ${accessRequest.status.toLowerCase()}`,
                currentStatus: accessRequest.status
            });
        }

        // Update the request
        accessRequest.status = status;
        accessRequest.approver = req.user._id;
        accessRequest.approverName = req.user.username;
        accessRequest.approvalDate = new Date();
        accessRequest.comments = comments || '';

        // Calculate expiry date if approved and has expiry days
        if (status === 'APPROVED' && accessRequest.expiryDays) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + accessRequest.expiryDays);
            accessRequest.expiryDate = expDate;
        }

        await accessRequest.save();

        // 📧 Try sending an email notification to the requester
        try {
            const requester = await User.findById(accessRequest.requester);
            if (requester && requester.email) {
                const message = `Hello ${requester.username},\n\nYour access request for '${accessRequest.resourceName}' has been ${status}.\n\n`
                    + `Reviewed By: ${req.user.username}\nComments: ${comments || 'None'}\n`
                    + (accessRequest.expiryDate ? `\nAccess Expires On: ${accessRequest.expiryDate.toDateString()}` : '');
                
                await sendEmail({
                    email: requester.email,
                    subject: `Access Request ${status} - ${accessRequest.resourceName}`,
                    message: message
                });
            }
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
            // We don't fail the request if email fails, it's just a notification
        }

        res.json({
            message: `Access request ${status.toLowerCase()} successfully`,
            request: accessRequest
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
