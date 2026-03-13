import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email et mot de passe requis (min. 6 caractères)' }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, password: hashed, name: name || null },
    });
  } catch (err) {
    console.error('[signup] error:', err);
    return NextResponse.json({ error: 'Erreur serveur. Réessaye.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
