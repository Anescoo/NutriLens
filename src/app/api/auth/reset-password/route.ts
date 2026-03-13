import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type TokenRow = { id: string; userId: string; expiresAt: string; used: number | boolean };

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Minimum 6 caractères.' }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<TokenRow[]>`
    SELECT id, "userId", "expiresAt", used FROM "PasswordResetToken" WHERE token = ${token} LIMIT 1
  `;
  const record = rows[0];

  if (!record) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 });
  }

  const isUsed = record.used === true || record.used === 1;
  const isExpired = new Date(record.expiresAt) < new Date();

  if (isUsed || isExpired) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  });

  await prisma.$executeRaw`
    UPDATE "PasswordResetToken" SET used = true WHERE token = ${token}
  `;

  return NextResponse.json({ success: true });
}
