import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('avatar') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${session.user.id}.${ext}`;
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');

  await fs.mkdir(avatarsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(avatarsDir, fileName), buffer);

  const avatarUrl = `/avatars/${fileName}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
