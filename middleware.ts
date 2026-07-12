import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { RoleName } from '@/types/auth';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const roles = (token?.roles || []) as RoleName[];

    // 1. ADMIN has global access to all routes
    if (roles.includes('ADMIN')) {
      return NextResponse.next();
    }

    // 2. Settings protection (Only ADMIN can access settings)
    if (path.startsWith('/settings')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    // 3. Expenses protection (Only ADMIN & FINANCIAL_ANALYST can access expenses)
    if (path.startsWith('/expenses') && !roles.includes('FINANCIAL_ANALYST')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    // 4. Drivers and Vehicles management (Only ADMIN & FLEET_MANAGER can modify/access registries)
    if ((path.startsWith('/drivers') || path.startsWith('/vehicles')) && !roles.includes('FLEET_MANAGER')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    // 5. Maintenance management (Only ADMIN, FLEET_MANAGER, & SAFETY_OFFICER can manage maintenance)
    if (path.startsWith('/maintenance') && !roles.includes('FLEET_MANAGER') && !roles.includes('SAFETY_OFFICER')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    // 6. Analytics and Reports (Only ADMIN, FLEET_MANAGER, & FINANCIAL_ANALYST)
    if ((path.startsWith('/analytics') || path.startsWith('/reports')) && !roles.includes('FLEET_MANAGER') && !roles.includes('FINANCIAL_ANALYST')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    // 7. Trips and Fuel (ADMIN, FLEET_MANAGER, or DRIVER)
    if ((path.startsWith('/trips') || path.startsWith('/fuel')) && !roles.includes('FLEET_MANAGER') && !roles.includes('DRIVER')) {
      return NextResponse.redirect(new URL('/forbidden', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
  }
);

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
