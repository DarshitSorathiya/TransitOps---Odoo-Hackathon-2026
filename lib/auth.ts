import { NextAuthOptions, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { RoleName } from '@/types/auth';

// Extend NextAuth types to support custom roles strictly
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: RoleName[];
    } & DefaultSession['user'];
  }

  interface User {
    roles: RoleName[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    roles: RoleName[];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@transitops.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password.');
        }

        // Find user by email and include their dynamic roles
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password.');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('Your account is currently inactive or suspended.');
        }

        // Compare password hashes
        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password.');
        }

        // Extract list of role names
        const roles = user.roles.map((ur) => ur.role.name as RoleName);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roles,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.roles = token.roles;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
