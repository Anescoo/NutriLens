import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json(measurements);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const measurement = await prisma.bodyMeasurement.create({
    data: {
      id: body.id,
      userId: session.user.id,
      date: body.date,
      weight: body.weight,
      height: body.height ?? null,
      bodyFat: body.bodyFat ?? null,
      muscleMass: body.muscleMass ?? null,
      waist: body.waist ?? null,
      chest: body.chest ?? null,
      leftArm: body.leftArm ?? null,
      rightArm: body.rightArm ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(measurement, { status: 201 });
}
