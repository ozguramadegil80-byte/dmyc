'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Car, ClipboardCheck, Wrench, Users, Star,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';

const NAV = [
  { href: '/admin/vehicles',    icon: Car,           label: 'Araçlar' },
  { href: '/admin/review',      icon: ClipboardCheck, label: 'İnceleme' },
  { href: '/admin/maintenance', icon: Wrench,         label: 'Bakım Adayları' },
  { href: '/admin/users',       icon: Users,          label: 'Kullanıcılar' },
  { href: '/admin/sponsor',     icon: Star,           label: 'Sponsor' },
];

const SIDEBAR_FULL = 240;
const SIDEBAR_MINI = 68;

export function AdminShell({
  children,
  username,
}: {
  children: React.ReactNode;
  username: string;
}) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  async function logout() {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const currentLabel = NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050d0e', color: '#c8d8da' }}>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: sidebarW,
        background: '#080f10',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        zIndex: 40,
        overflow: 'hidden',
        // mobile: slide in
      }}
        className="dmyc-sidebar"
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 60, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {!collapsed && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/yatay-logo.png" alt="DMyC" style={{ height: 26, width: 'auto' }} />
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: 'none', color: '#b0c4c6',
              borderRadius: 6, padding: 6, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0,
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, paddingTop: 12, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 12, padding: '11px 20px',
                  color: active ? '#00f0ff' : '#8fa8aa',
                  background: active ? 'rgba(0,240,255,0.07)' : 'transparent',
                  borderLeft: `3px solid ${active ? '#00f0ff' : 'transparent'}`,
                  textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                <Icon size={19} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: collapsed ? '12px 0' : '12px 16px',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <p style={{
              margin: '0 0 10px', fontSize: 12,
              color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {username}
            </p>
          )}
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', background: 'none', border: 'none',
              color: '#8fa8aa', cursor: 'pointer', fontSize: 14,
              padding: collapsed ? '8px 0' : '8px 4px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 6, transition: 'color 0.15s',
            }}
          >
            <LogOut size={18} />
            {!collapsed && <span>Çıkış yap</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{
        marginLeft: sidebarW,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
      }}>

        {/* Top bar */}
        <header style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          background: '#080f10',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(o => !o)}
              style={{
                display: 'none', background: 'none', border: 'none',
                color: '#b0c4c6', cursor: 'pointer', padding: 4,
              }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#dbfcff' }}>
              {currentLabel}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, color: 'rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20,
            }}>
              {username}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 28, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dmyc-sidebar {
            transform: translateX(${mobileOpen ? '0' : '-100%'}) !important;
            width: ${SIDEBAR_FULL}px !important;
            transition: transform 0.25s ease !important;
          }
          .mobile-menu-btn { display: flex !important; }
          [style*="marginLeft"] { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
