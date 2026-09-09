import { connectDB } from '../../lib/db.js';
import { Key } from '../../lib/models.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const { key, robloxId, robloxUsername, hwid } = req.body;

        // Validasi input
        if (!key || !robloxId || !hwid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Data tidak lengkap' 
            });
        }

        const keyDoc = await Key.findOne({ key: key.toUpperCase().trim() });

        // Key tidak ditemukan
        if (!keyDoc) {
            return res.status(200).json({ 
                success: false, 
                error: 'Key tidak valid! Pastikan key yang dimasukkan benar.' 
            });
        }

        // Key direvoke
        if (keyDoc.status === 'revoked') {
            return res.status(200).json({ 
                success: false, 
                error: 'Key ini telah dinonaktifkan oleh admin.' 
            });
        }

        // Key expired
        if (keyDoc.status === 'expired') {
            return res.status(200).json({ 
                success: false, 
                error: 'Key ini sudah kadaluarsa.' 
            });
        }

        // Key sudah pernah diredeeem
        if (keyDoc.status === 'redeemed') {
            
            // Cek apakah HWID sama (anti-share device)
            if (keyDoc.redeemedBy.hwid !== hwid) {
                return res.status(200).json({
                    success: false,
                    error: 'Key ini sudah digunakan di perangkat lain!'
                });
            }

            // Cek apakah Roblox ID sama (anti-share akun)
            if (keyDoc.redeemedBy.robloxId !== String(robloxId)) {
                return res.status(200).json({
                    success: false,
                    error: 'Key ini terdaftar untuk akun Roblox lain!'
                });
            }

            // Cek apakah sudah expired
            if (new Date() > new Date(keyDoc.redeemedBy.expiresAt)) {
                await Key.updateOne(
                    { key: keyDoc.key }, 
                    { $set: { status: 'expired' } }
                );
                return res.status(200).json({
                    success: false,
                    error: 'Key kamu sudah kadaluarsa! Hubungi admin untuk perpanjang.'
                });
            }

            // Masih valid - hitung sisa hari
            const sisaMs   = new Date(keyDoc.redeemedBy.expiresAt) - new Date();
            const sisaHari = Math.ceil(sisaMs / (1000 * 60 * 60 * 24));

            return res.status(200).json({
                success: true,
                alreadyRedeemed: true,
                message: `Key masih aktif! Sisa ${sisaHari} hari`,
                expiresAt: keyDoc.redeemedBy.expiresAt,
                remainingDays: sisaHari,
                robloxUsername: keyDoc.redeemedBy.robloxUsername
            });
        }

        // Redeem baru - hitung tanggal expired
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + keyDoc.expiresIn);

        await Key.updateOne(
            { key: keyDoc.key },
            {
                $set: {
                    status: 'redeemed',
                    redeemedBy: {
                        robloxId:       String(robloxId),
                        robloxUsername: robloxUsername || 'Unknown',
                        redeemedAt:     new Date(),
                        expiresAt:      expiresAt,
                        hwid:           hwid
                    }
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: `Berhasil! Plugin aktif selama ${keyDoc.expiresIn} hari`,
            expiresAt: expiresAt,
            remainingDays: keyDoc.expiresIn
        });

    } catch (err) {
        console.error('[REDEEM ERROR]', err);
        return res.status(500).json({ 
            success: false, 
            error: 'Terjadi kesalahan server' 
        });
    }
}