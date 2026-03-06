import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string } }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) (session.user as unknown as Record<string, unknown>).id = token.id as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
