'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/recipes', label: 'Recipes' },
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
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Esca
          </Link>

          <div className="flex gap-4 text-sm">
            {links.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'text-neutral-900 font-medium'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="ml-auto text-sm text-neutral-500 hover:text-neutral-900"
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
