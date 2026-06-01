'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/empleados', label: 'Empleados', icon: Users },
  { href: '/incidencias', label: 'Incidencias', icon: AlertTriangle },
  { href: '/memorandums', label: 'Memorándums', icon: FileText },
  { href: '/bonos', label: 'Bonos', icon: DollarSign },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated');
    }
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-sidebar-foreground">
              RGR Selva
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Control Disciplinario
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                RGR Selva Vehículos y Maquinarias E.I.R.L.
              </p>
              <button onClick={handleLogout} className="text-sm text-destructive">Cerrar sesión</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}