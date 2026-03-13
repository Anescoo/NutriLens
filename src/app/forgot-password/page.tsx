'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      setSent(true);
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
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Mot de passe oublié ?</h1>
          <p className="text-[#52507A] text-sm">
            {sent
              ? 'Vérifie ta boîte mail.'
              : 'Entre ton email pour recevoir un lien de réinitialisation.'}
          </p>
        </div>

        {sent ? (
          <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#0ED4A0]/15 border border-[#0ED4A0]/25 flex items-center justify-center mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ED4A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white text-sm font-semibold">Email envoyé !</p>
            <p className="text-[#52507A] text-xs leading-relaxed">
              Si un compte existe pour <span className="text-[#9D80FF]">{email}</span>, un lien de réinitialisation t&apos;a été envoyé. Vérifie tes spams.
            </p>
            <Link href="/login" className="block w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors text-center">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-[#F04E6E]/10 border border-[#F04E6E]/30 rounded-xl px-3 py-2 text-[#F04E6E] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#52507A] mb-1.5">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="toi@exemple.com"
                className="w-full bg-[#080810] border border-[#1A1A32] focus:border-[#7C3AED] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52507A] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
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
