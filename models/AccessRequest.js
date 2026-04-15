import mongoose from 'mongoose';

const accessRequestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requesterName: {
        type: String,
        required: true
    },
    resourceName: {
        type: String,
        required: true,
        trim: true
    },
    accessType: {
        type: String,
        enum: ['READ', 'WRITE', 'ADMIN', 'FULL'],
        required: true
    },
    reason: {
        type: String,
        required: true,
        minlength: 10
    },
    department: {
        type: String,
        default: 'General',
        trim: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    expiryDays: {
        type: Number,
        default: null
    },
    expiryDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approverName: {
        type: String,
        default: null
    },
    approvalDate: {
        type: Date,
        default: null
    },
    comments: {
        type: String,
        default: ''
    },

    // ── AI Fields ──────────────────────────────────────────

    aiValidationScore: {
        type: Number,
        default: null,
        min: 1,
        max: 10
    },

    aiSuggestion: {
        type: String,
        default: ''
    },

    // ✅ NEW — AI Recommendation

    recommendation: {
        type: String,
        default: "Needs Manual Review"
    },

    confidence: {
        type: Number,
        default: 70
    },

    // ── ML Risk Score Fields ───────────────────────────────

    riskScore: {
        type: Number,
        default: null,
        min: 0,
        max: 100
    },

    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', null],
        default: null
    },

    // ──────────────────────────────────────────────────────

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt automatically
accessRequestSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Text index for search
accessRequestSchema.index({
    resourceName: 'text',
    requesterName: 'text',
    reason: 'text'
});

const AccessRequest = mongoose.model(
    'AccessRequest',
    accessRequestSchema
);

export default AccessRequest;