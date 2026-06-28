import express from 'express';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * GET /api/qr/:hospitalId
 * Generate a QR code PNG (as data URL) that points to the patient portal.
 */
router.get('/:hospitalId', async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    // Dynamically fallback to the current request's origin in production if CLIENT_URL is not set
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fallbackUrl = `${protocol}://${host}`;

    const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? fallbackUrl : 'http://localhost:5173');

    // QR encodes the patient entry URL with hospital ID
    const patientUrl = `${clientUrl}/qr?hospital=${hospitalId}`;

    const qrDataUrl = await QRCode.toDataURL(patientUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#075E54', // WhatsApp green for branding
        light: '#FFFFFF',
      },
    });

    res.json({
      qrDataUrl,
      patientUrl,
      hospitalId,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
