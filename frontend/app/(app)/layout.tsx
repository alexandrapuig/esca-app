'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/profile', label: 'Profile' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4 md:px-12">
          <Link href="/dashboard" className="font-serif text-2xl text-emerald-900">
            Esca
          </Link>

          <div className="flex gap-6 text-sm">
            {links.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'font-medium text-emerald-900'
                      : 'text-gray-500 transition hover:text-emerald-900'
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400"
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
