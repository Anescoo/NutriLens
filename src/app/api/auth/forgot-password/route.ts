import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string };

  if (!email) {
    return NextResponse.json({ error: 'Email requis.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid user enumeration
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Invalidate any existing unused tokens for this user (raw SQL)
  await prisma.$executeRaw`
    UPDATE "PasswordResetToken" SET used = true WHERE "userId" = ${user.id} AND used = false
  `;

  const token = crypto.randomBytes(32).toString('hex');
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await prisma.$executeRaw`
    INSERT INTO "PasswordResetToken" (id, token, "userId", "expiresAt", used, "createdAt")
    VALUES (${id}, ${token}, ${user.id}, ${new Date(expiresAt)}, false, ${new Date()})
  `;

  const host = req.headers.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXTAUTH_URL ?? `${protocol}://${host}`;
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error('[forgot-password] email send failed:', err);
    // Still return success — token is created, link logged to console above
  }

  return NextResponse.json({ success: true });
}
