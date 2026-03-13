import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const email = process.env.VAPID_EMAIL?.trim() ?? 'nutrilens@example.com';

  if (!pub || !priv) {
    throw new Error('[webpush] VAPID keys not set.');
  }

  webpush.setVapidDetails(`mailto:${email}`, pub, priv);
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<void> {
  initWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify({ ...payload, icon: '/icons/icon-192.png' }),
  );
}
