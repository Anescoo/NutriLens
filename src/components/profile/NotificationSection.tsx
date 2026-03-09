'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotifPrefs {
  mealReminders: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  workoutReminder: boolean;
  workoutTime: string;
}

const DEFAULT_PREFS: NotifPrefs = {
  mealReminders: true,
  breakfastTime: '08:00',
  lunchTime: '12:30',
  dinnerTime: '19:30',
  workoutReminder: false,
  workoutTime: '09:00',
};

const STORAGE_KEY = 'nutrilens_notif_prefs';

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(p: NotifPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

type PermStatus = 'unknown' | 'granted' | 'denied' | 'default' | 'unsupported';

function msUntilTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

async function subscribeUser(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
    return null;
  }
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotificationSection() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<PermStatus>('unknown');
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  // const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null); // dev only

  useEffect(() => {
    setMounted(true);
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermStatus);
    setPrefs(loadPrefs());

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, []);

  // Schedule reminders whenever prefs change and we're subscribed
  useEffect(() => {
    if (!subscribed || permission !== 'granted') return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (prefs.mealReminders) {
      (['breakfast', 'lunch', 'dinner'] as const).forEach((meal, i) => {
        const times = [prefs.breakfastTime, prefs.lunchTime, prefs.dinnerTime];
        const ms = msUntilTime(times[i]);
        timers.push(
          setTimeout(() => {
            fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: meal }) });
          }, ms)
        );
      });
    }

    if (prefs.workoutReminder) {
      const ms = msUntilTime(prefs.workoutTime);
      timers.push(
        setTimeout(() => {
          fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'workout' }) });
        }, ms)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [subscribed, permission, prefs]);

  const enable = useCallback(async () => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermStatus);
      if (result !== 'granted') { setLoading(false); return; }

      const sub = await subscribeUser();
      if (!sub) { setLoading(false); return; }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch (e) {
      console.error('[push] enable error', e);
    }
    setLoading(false);
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.error('[push] disable error', e);
    }
    setLoading(false);
  }, []);

  // const sendTest = useCallback(async () => { // dev only
  //   setTestResult(null);
  //   const res = await fetch('/api/push/send', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ type: 'test' }),
  //   });
  //   setTestResult(res.ok ? 'ok' : 'error');
  //   setTimeout(() => setTestResult(null), 3000);
  // }, []);

  const updatePref = <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  if (!mounted) return null;

  if (permission === 'unsupported') {
    return (
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-2">Notifications</h2>
        <p className="text-[#6B6B8A] text-sm">Les notifications ne sont pas supportées sur ce navigateur.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
      <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Notifications</h2>

      {/* Permission / subscription toggle */}
      {!subscribed ? (
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-white font-medium">Activer les rappels</p>
            <p className="text-[10px] text-[#6B6B8A] mt-0.5">
              {permission === 'denied'
                ? 'Bloquées dans le navigateur — autorise-les dans les réglages'
                : 'Rappels repas et séances'}
            </p>
          </div>
          <button
            onClick={enable}
            disabled={loading || permission === 'denied'}
            className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold disabled:opacity-40 transition-colors hover:bg-[#6D28D9] shrink-0"
          >
            {loading ? '…' : 'Activer'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-sm text-white font-medium">Notifications actives</p>
            </div>
            <div className="flex items-center gap-2">
              {/* TEST BUTTON — dev only, uncomment to test push notifications
              <button
                onClick={sendTest}
                className="px-3 py-1.5 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] text-xs hover:border-[#7C3AED] transition-colors"
              >
                {testResult === 'ok' ? '✓ Envoyée' : testResult === 'error' ? '✗ Erreur' : 'Tester'}
              </button>
              */}
              <button
                onClick={disable}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-[#0F0F1A] border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
              >
                {loading ? '…' : 'Désactiver'}
              </button>
            </div>
          </div>

          {/* Meal reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">Rappels repas</p>
              <Toggle value={prefs.mealReminders} onChange={(v) => updatePref('mealReminders', v)} />
            </div>

            {prefs.mealReminders && (
              <div className="ml-0 space-y-2 pl-0">
                {([
                  ['breakfastTime', 'Petit-déjeuner'] as const,
                  ['lunchTime', 'Déjeuner'] as const,
                  ['dinnerTime', 'Dîner'] as const,
                ]).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between bg-[#0F0F1A] rounded-xl px-3 py-2">
                    <span className="text-xs text-[#6B6B8A]">{label}</span>
                    <input
                      type="time"
                      value={prefs[key]}
                      onChange={(e) => updatePref(key, e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none text-right"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Workout reminder */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">Rappel séance</p>
              <Toggle value={prefs.workoutReminder} onChange={(v) => updatePref('workoutReminder', v)} />
            </div>

            {prefs.workoutReminder && (
              <div className="flex items-center justify-between bg-[#0F0F1A] rounded-xl px-3 py-2">
                <span className="text-xs text-[#6B6B8A]">Heure</span>
                <input
                  type="time"
                  value={prefs.workoutTime}
                  onChange={(e) => updatePref('workoutTime', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none text-right"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#6B6B8A] mt-3">
            Les rappels se déclenchent lorsque l&apos;app est ouverte ou en arrière-plan.
          </p>
        </>
      )}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={[
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        value ? 'bg-[#7C3AED]' : 'bg-[#2d1f5e]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
          value ? 'left-[22px]' : 'left-[2px]',
        ].join(' ')}
      />
    </button>
  );
}
