'use client';

import { Sidebar } from './sidebar';
import { useEffect } from 'react';
import { cleanupLocalStorage } from '@/lib/storage';
import { usePathname, useRouter } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    cleanupLocalStorage();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAuth = window.localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth && pathname !== '/login') {
      router.push('/login');
    }
    if (isAuth && pathname === '/login') {
      router.push('/');
    }
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-8 pt-16 lg:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
