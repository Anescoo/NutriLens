import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendPush, type PushPayload } from '@/lib/webpush';

const MESSAGES: Record<string, PushPayload> = {
  breakfast: {
    title: 'Petit-déjeuner',
    body: "N'oublie pas de logger ton petit-déjeuner !",
    url: '/journal',
  },
  lunch: {
    title: 'Déjeuner',
    body: "N'oublie pas de logger ton déjeuner !",
    url: '/journal',
  },
  dinner: {
    title: 'Dîner',
    body: "N'oublie pas de logger ton dîner !",
    url: '/journal',
  },
  workout: {
    title: 'Séance du jour',
    body: "C'est l'heure de ta séance ! Bonne muscu 💪",
    url: '/workout',
  },
  test: {
    title: 'NutriLens',
    body: 'Les notifications fonctionnent correctement !',
    url: '/',
  },
};

// POST /api/push/send — send a push notification to the current user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await req.json() as { type: string };
  const payload = MESSAGES[type];
  if (!payload) return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  if (subs.length === 0) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const results = await Promise.allSettled(
    subs.map((sub) => sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload))
  );

  // Clean up expired subscriptions (410 Gone)
  const expired: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410) expired.push(subs[i].endpoint);
    }
  });
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent });
}
