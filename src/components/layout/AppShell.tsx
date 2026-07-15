import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface NavigationItem {
  id: string;
  label: string;
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  navigationItems?: NavigationItem[];
  activeItem?: string;
  onChangeItem?: (itemId: string) => void;
  children: ReactNode;
}

export function AppShell({
  title,
  subtitle,
  navigationItems = [],
  activeItem,
  onChangeItem,
  children,
}: AppShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-slate-900">
      <header className="border-b border-black/10 bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-white/55">
              Robust Delivery Platform
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {user ? (
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80">
                {user.email} · {user.role}
              </span>
            ) : null}
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-white transition-colors hover:bg-white hover:text-black"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {navigationItems.length > 0 ? (
          <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4 md:px-8">
            {navigationItems.map((item) => {
              const isActive = item.id === activeItem;

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeItem?.(item.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white text-black'
                      : 'border border-white/15 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}