import express from 'express';
import { body } from 'express-validator';
import {
    createAccessRequest,
    getMyRequests,
    getAllRequests,
    updateRequestStatus,
    exportCSV,
    exportPDF
} from '../controllers/requestController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createRequestValidation = [
    body('resourceName').trim().notEmpty().withMessage('Resource name is required'),
    body('accessType').isIn(['READ', 'WRITE', 'ADMIN', 'FULL']).withMessage('Invalid access type'),
    body('reason').trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters')
];

const updateStatusValidation = [
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
    body('comments').optional().trim()
];

// REQUESTER routes
router.post('/', protect, authorize('REQUESTER'), createRequestValidation, createAccessRequest);
router.get('/my-requests', protect, authorize('REQUESTER'), getMyRequests);

// APPROVER + ADMIN routes
router.get('/all', protect, authorize('APPROVER', 'ADMIN'), getAllRequests);
router.put('/:id/status', protect, authorize('APPROVER', 'ADMIN'), updateStatusValidation, updateRequestStatus);

// Export routes
router.get('/export/csv', protect, authorize('APPROVER', 'ADMIN'), exportCSV);
router.get('/export/pdf', protect, authorize('APPROVER', 'ADMIN'), exportPDF);

export default router;
