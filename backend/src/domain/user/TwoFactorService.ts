import { generateSecret as otplibGenerateSecret, generateURI, verify as otplibVerify } from 'otplib';
import QRCode from 'qrcode';
import { logger } from '../../shared/logger.js';

export class TwoFactorService {
  generateSecret(): string {
    return otplibGenerateSecret();
  }

  async generateQRCode(email: string, secret: string, issuer = 'Comfortrade'): Promise<string> {
    const otpauthUrl = generateURI({ secret, label: email, issuer });

    try {
      return await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate QR code');
      throw new Error('Failed to generate QR code');
    }
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    try {
      const result = await otplibVerify({ secret, token });
      return typeof result === 'boolean' ? result : (result as { valid?: boolean }).valid ?? false;
    } catch (error) {
      logger.error({ err: error }, 'Failed to verify TOTP token');
      return false;
    }
  }
}
