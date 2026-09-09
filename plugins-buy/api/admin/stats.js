import { connectDB } from '../../lib/db.js';
import { Key } from '../../lib/models.js';
import jwt from 'jsonwebtoken';

function verifyAdmin(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) throw new Error('No token');
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        verifyAdmin(req);
        await connectDB();

        // Auto-expire
        await Key.updateMany(
            { 
                status: 'redeemed', 
                'redeemedBy.expiresAt': { $lt: new Date() } 
            },
            { $set: { status: 'expired' } }
        );

        // Hitung semua statistik sekaligus
        const [total, active, redeemed, expired, revoked, recentRedeems] = 
            await Promise.all([
                Key.countDocuments(),
                Key.countDocuments({ status: 'active' }),
                Key.countDocuments({ status: 'redeemed' }),
                Key.countDocuments({ status: 'expired' }),
                Key.countDocuments({ status: 'revoked' }),
                Key.find({ 'redeemedBy.redeemedAt': { $exists: true } })
                    .sort({ 'redeemedBy.redeemedAt': -1 })
                    .limit(5)
                    .lean()
            ]);

        return res.status(200).json({
            success: true,
            total,
            active,
            redeemed,
            expired,
            revoked,
            recentRedeems
        });

    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token tidak valid' });
        }
        console.error('[STATS ERROR]', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
}