import mongoose from 'mongoose';

// ===== KEY SCHEMA =====
const KeySchema = new mongoose.Schema({
    key: { 
        type: String, 
        unique: true, 
        required: true 
    },
    createdBy: { 
        type: String, 
        default: 'admin' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    expiresIn: { 
        type: Number, 
        required: true 
    },
    redeemedBy: {
        robloxId:       String,
        robloxUsername: String,
        redeemedAt:     Date,
        expiresAt:      Date,
        hwid:           String
    },
    status: {
        type: String,
        enum: ['active', 'redeemed', 'expired', 'revoked'],
        default: 'active'
    },
    lastValidated:   Date,
    validationCount: { type: Number, default: 0 }
});

// ===== ADMIN SCHEMA =====
const AdminSchema = new mongoose.Schema({
    username: { 
        type: String, 
        unique: true, 
        required: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['superadmin', 'admin'],
        default: 'admin' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

export const Key   = mongoose.models.Key   || mongoose.model('Key', KeySchema);
export const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);