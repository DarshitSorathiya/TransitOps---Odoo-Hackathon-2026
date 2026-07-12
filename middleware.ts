import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/vehicles',
    '/vehicles/:path*',
    '/drivers',
    '/drivers/:path*',
    '/trips',
    '/trips/:path*',
    '/maintenance',
    '/maintenance/:path*',
    '/fuel',
    '/fuel/:path*',
    '/expenses',
    '/expenses/:path*',
    '/analytics',
    '/analytics/:path*',
    '/notifications',
    '/notifications/:path*',
    '/reports',
    '/reports/:path*',
    '/settings',
    '/settings/:path*',
  ],
};
