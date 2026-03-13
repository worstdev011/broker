import { generateSecret as otplibGenerateSecret, generateURI, verify as otplibVerify } from 'otplib';
import QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
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

  generateBackupCodes(count = 8): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );
  }

  hashBackupCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hashedCode = this.hashBackupCode(code);
    return hashedCodes.includes(hashedCode);
  }

  removeBackupCode(code: string, hashedCodes: string[]): string[] {
    const hashedCode = this.hashBackupCode(code);
    return hashedCodes.filter((h) => h !== hashedCode);
  }
}
