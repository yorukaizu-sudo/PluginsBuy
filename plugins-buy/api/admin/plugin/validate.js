import { connectDB } from '../../lib/db.js';
import { Key } from '../../lib/models.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const { key, hwid, robloxId } = req.body;

        if (!key || !hwid || !robloxId) {
            return res.status(200).json({ 
                valid: false, 
                error: 'Data tidak lengkap' 
            });
        }

        const keyDoc = await Key.findOne({ key: key.toUpperCase().trim() });

        // Tidak ditemukan atau status bukan redeemed
        if (!keyDoc || keyDoc.status !== 'redeemed') {
            return res.status(200).json({ 
                valid: false, 
                error: 'Key tidak valid atau belum aktif' 
            });
        }

        // Cek HWID
        if (keyDoc.redeemedBy.hwid !== hwid) {
            return res.status(200).json({ 
                valid: false, 
                error: 'Perangkat tidak cocok' 
            });
        }

        // Cek Roblox ID
        if (keyDoc.redeemedBy.robloxId !== String(robloxId)) {
            return res.status(200).json({ 
                valid: false, 
                error: 'Akun Roblox tidak cocok' 
            });
        }

        // Cek expired
        if (new Date() > new Date(keyDoc.redeemedBy.expiresAt)) {
            await Key.updateOne(
                { key: keyDoc.key }, 
                { $set: { status: 'expired' } }
            );
            return res.status(200).json({ 
                valid: false, 
                error: 'Key sudah kadaluarsa' 
            });
        }

        // Semua valid - update last validated
        const sisaMs   = new Date(keyDoc.redeemedBy.expiresAt) - new Date();
        const sisaHari = Math.ceil(sisaMs / (1000 * 60 * 60 * 24));

        await Key.updateOne(
            { key: keyDoc.key },
            {
                $set:  { lastValidated: new Date() },
                $inc:  { validationCount: 1 }
            }
        );

        return res.status(200).json({
            valid: true,
            remainingDays: sisaHari,
            expiresAt: keyDoc.redeemedBy.expiresAt,
            robloxUsername: keyDoc.redeemedBy.robloxUsername
        });

    } catch (err) {
        console.error('[VALIDATE ERROR]', err);
        return res.status(500).json({ 
            valid: false, 
            error: 'Terjadi kesalahan server' 
        });
    }
}