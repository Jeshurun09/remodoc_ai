import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// POST /api/auth/2fa/setup - Setup 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'setup') {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Remodoc (${session.user.email})`,
        issuer: 'Remodoc'
      });

      // Save to database
      const twoFactor = await prisma.twoFactorAuth.upsert({
        where: { userId: session.user.id },
        update: {
          secret: secret.base32,
          isEnabled: false,
          backupCodes: [], // Will generate after verification
        },
        create: {
          userId: session.user.id,
          secret: secret.base32,
          isEnabled: false,
          backupCodes: [],
        },
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      return NextResponse.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        message: '2FA setup initiated. Scan QR code with authenticator app.'
      });
    }

    if (action === 'verify') {
      const { token } = await request.json();

      const twoFactor = await prisma.twoFactorAuth.findUnique({
        where: { userId: session.user.id },
      });

      if (!twoFactor) {
        return NextResponse.json({ error: '2FA not set up' }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time windows (30 seconds each)
      });

      if (!verified) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      // Generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
      }

      await prisma.twoFactorAuth.update({
        where: { userId: session.user.id },
        data: {
          isEnabled: true,
          backupCodes,
          verifiedAt: new Date(),
        },
      });

      // Log security event
      await prisma.securityAuditLog.create({
        data: {
          userId: session.user.id,
          action: '2FA_ENABLED',
          resource: 'USER',
          resourceId: session.user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          details: { method: 'TOTP_SETUP' },
        },
      });

      return NextResponse.json({
        message: '2FA enabled successfully',
        backupCodes,
      });
    }

    if (action === 'disable') {
      const { token } = await request.json();

      const twoFactor = await prisma.twoFactorAuth.findUnique({
        where: { userId: session.user.id },
      });

      if (!twoFactor?.isEnabled) {
        return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!verified) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      await prisma.twoFactorAuth.delete({
        where: { userId: session.user.id },
      });

      // Log security event
      await prisma.securityAuditLog.create({
        data: {
          userId: session.user.id,
          action: '2FA_DISABLED',
          resource: 'USER',
          resourceId: session.user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          details: { method: 'TOTP_DISABLE' },
        },
      });

      return NextResponse.json({ message: '2FA disabled successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/auth/2fa/status - Check 2FA status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
      select: {
        isEnabled: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      isEnabled: twoFactor?.isEnabled || false,
      setupDate: twoFactor?.createdAt,
      verifiedAt: twoFactor?.verifiedAt,
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}