import { connectDB } from '../../lib/db.js';
import { Key } from '../../lib/models.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Verifikasi token admin
function verifyAdmin(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        throw new Error('Token tidak ada');
    }
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
}

// Generate format SURF-XXXX-XXXX-XXXX-XXXX
function makeKey() {
    const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    return `SURF-${part()}-${part()}-${part()}-${part()}`;
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
        const admin = verifyAdmin(req);
        await connectDB();

        const { expiresIn, amount = 1 } = req.body;

        // Validasi
        if (!expiresIn || Number(expiresIn) < 1) {
            return res.status(400).json({ 
                error: 'Durasi minimal 1 hari' 
            });
        }

        const jumlah = Math.min(Number(amount), 50);
        const hasilKeys = [];

        for (let i = 0; i < jumlah; i++) {
            let key;
            let sudahAda = true;

            // Pastikan key unik
            while (sudahAda) {
                key = makeKey();
                sudahAda = await Key.findOne({ key });
            }

            const newKey = await Key.create({
                key,
                createdBy: admin.username,
                expiresIn: Number(expiresIn),
                status: 'active'
            });

            hasilKeys.push(newKey);
        }

        return res.status(200).json({ 
            success: true, 
            keys: hasilKeys,
            total: hasilKeys.length
        });

    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
        }
        console.error('[GENERATE KEY ERROR]', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
}