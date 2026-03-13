'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#08080F]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9D80FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Nouveau mot de passe</h1>
          <p className="text-[#52507A] text-sm">Choisis un mot de passe sécurisé.</p>
        </div>

        {done ? (
          <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#0ED4A0]/15 border border-[#0ED4A0]/25 flex items-center justify-center mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ED4A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white text-sm font-semibold">Mot de passe mis à jour !</p>
            <p className="text-[#52507A] text-xs">Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-[#F04E6E]/10 border border-[#F04E6E]/30 rounded-xl px-3 py-2 text-[#F04E6E] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#52507A] mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-[#080810] border border-[#1A1A32] focus:border-[#7C3AED] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52507A] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#52507A] mb-1.5">Confirmer</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-[#080810] border border-[#1A1A32] focus:border-[#7C3AED] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52507A] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Mise à jour…' : 'Confirmer'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#52507A] mt-4">
          <Link href="/login" className="text-[#9D80FF] hover:text-[#7C3AED] transition-colors">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
