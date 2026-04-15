import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    username: {
        type: String,
        default: 'System'
    },
    action: {
        type: String,
        required: true,
        enum: [
            'USER_LOGIN',
            'USER_LOGOUT',
            'USER_REGISTER',
            'REQUEST_CREATED',
            'REQUEST_APPROVED',
            'REQUEST_REJECTED',
            'USER_DELETED',
            'EXPORT_REPORT',
            'AI_VALIDATION',
            'CHAT_MESSAGE'
        ]
    },
    details: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    },
    resourceName: {
        type: String,
        default: ''
    },
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccessRequest',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for fast queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
