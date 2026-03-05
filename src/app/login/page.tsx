'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Email ou mot de passe incorrect');
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0F0F1A]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">NutriLens</h1>
          <p className="text-[#6B6B8A] text-sm">Connecte-toi pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

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
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B6B8A] mt-4">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-[#A78BFA] hover:text-[#7C3AED] transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
