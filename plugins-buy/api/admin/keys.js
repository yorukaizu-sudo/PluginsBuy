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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        verifyAdmin(req);
        await connectDB();

        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ error: 'Key wajib diisi' });
        }

        const keyDoc = await Key.findOneAndUpdate(
            { key: key.toUpperCase() },
            { $set: { status: 'revoked' } },
            { new: true }
        );

        if (!keyDoc) {
            return res.status(404).json({ error: 'Key tidak ditemukan' });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Key berhasil direvoke' 
        });

    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token tidak valid' });
        }
        console.error('[REVOKE ERROR]', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
}