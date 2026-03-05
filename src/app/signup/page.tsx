'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Erreur lors de la création du compte');
      setLoading(false);
      return;
    }

    // Auto-login after signup
    await signIn('credentials', { email, password, redirect: false });
    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0F0F1A]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">NutriLens</h1>
          <p className="text-[#6B6B8A] text-sm">Crée ton compte gratuitement</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-[#6B6B8A] mb-1.5">Prénom (optionnel)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6B6B8A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="toi@exemple.com"
              className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6B6B8A] mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Minimum 6 caractères"
              className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B6B8A] mt-4">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-[#A78BFA] hover:text-[#7C3AED] transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
