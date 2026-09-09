import { connectDB } from '../../lib/db.js';
import { Admin } from '../../lib/models.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const { username, password } = req.body;

        // Validasi input
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username dan password wajib diisi' 
            });
        }

        // Cari admin
        const admin = await Admin.findOne({ username: username.trim() });
        if (!admin) {
            return res.status(401).json({ 
                error: 'Username atau password salah' 
            });
        }

        // Cek password
        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ 
                error: 'Username atau password salah' 
            });
        }

        // Buat token
        const token = jwt.sign(
            { 
                id: admin._id,
                username: admin.username, 
                role: admin.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            success: true,
            token,
            role: admin.role,
            username: admin.username
        });

    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        return res.status(500).json({ 
            error: 'Terjadi kesalahan server' 
        });
    }
}