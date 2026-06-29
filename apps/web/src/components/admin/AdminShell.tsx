'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Car, ClipboardCheck, Users, Star, AlertTriangle, Wrench,
  Bell, ChevronLeft, ChevronRight, KeyRound, LogOut, Menu, Settings, UserRound, X,
} from 'lucide-react';

const NAV = [
  { href: '/admin/vehicles',     icon: Car,            label: 'Araçlar' },
  { href: '/admin/review',       icon: ClipboardCheck, label: 'İnceleme' },
  { href: '/admin/users',        icon: Users,          label: 'Kullanıcılar' },
  { href: '/admin/sponsor',      icon: Star,           label: 'Sponsor' },
  { href: '/admin/anomalies',    icon: AlertTriangle,  label: 'Anomaliler' },
  { href: '/admin/maintenance',  icon: Wrench,         label: 'Bakım Adayları' },
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
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarExpanded = mobileOpen || !collapsed;
  const sidebarW = sidebarExpanded ? SIDEBAR_FULL : SIDEBAR_MINI;

  async function logout() {
    setAccountMenuOpen(false);
    try {
      await fetch('/api/admin-auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } finally {
      window.location.replace('/admin/login');
    }
  }

  function openUsersProfile() {
    setAccountMenuOpen(false);
    router.push('/admin/users?adminProfile=1');
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
        onMouseEnter={() => {
          if (!mobileOpen) setCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!mobileOpen) setCollapsed(true);
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 60, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {sidebarExpanded && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/yatay-logo.png" alt="DMyC" style={{ height: 26, width: 'auto' }} />
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: 'none', color: '#b0c4c6',
              borderRadius: 6, padding: 6, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              marginLeft: sidebarExpanded ? 0 : 'auto', marginRight: sidebarExpanded ? 0 : 'auto',
            }}
          >
            {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
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
                {sidebarExpanded && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: sidebarExpanded ? '12px 16px' : '12px 0',
          flexShrink: 0,
        }}>
          {sidebarExpanded && (
            <p style={{
              margin: '0 0 10px', fontSize: 12,
              color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {username}
            </p>
          )}
          <button
            type="button"
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', background: 'none', border: 'none',
              color: '#8fa8aa', cursor: 'pointer', fontSize: 14,
              padding: sidebarExpanded ? '8px 4px' : '8px 0',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              borderRadius: 6, transition: 'color 0.15s',
            }}
          >
            <LogOut size={18} />
            {sidebarExpanded && <span>Çıkış yap</span>}
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
      }}
        onClick={() => {
          if (!mobileOpen) setCollapsed(true);
          setAccountMenuOpen(false);
        }}
      >

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
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              title="Bildirimler"
              onClick={() => setAccountMenuOpen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#8fa8aa',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Bell size={16} />
              <span style={{
                position: 'absolute',
                top: 7,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#00f0ff',
                boxShadow: '0 0 10px rgba(0,240,255,0.8)',
              }} />
            </button>
            <button
              type="button"
              onClick={() => setAccountMenuOpen(open => !open)}
              style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                border: '1px solid rgba(255,255,255,0.1)',
                background: accountMenuOpen ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.04)',
                color: '#dbe7ef',
                padding: '0 10px 0 6px',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(0,240,255,0.12)',
                border: '1px solid rgba(0,240,255,0.24)',
                color: '#00f0ff',
              }}>
                <UserRound size={15} />
              </span>
              <span style={{
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
                color: 'rgba(255,255,255,0.64)',
              }}>
                {username}
              </span>
            </button>
            {accountMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 44,
                zIndex: 60,
                width: 250,
                background: '#0b1517',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#dbfcff', fontSize: 13, fontWeight: 700 }}>{username}</div>
                  <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, marginTop: 3 }}>Panel yöneticisi</div>
                </div>
                {[
                  { icon: UserRound, label: 'Profil bilgileri', hint: 'Kullanıcılar tablosundan düzenle', onClick: openUsersProfile },
                  { icon: KeyRound, label: 'Şifre değişimi', hint: 'Admin satırından düzenle', onClick: openUsersProfile },
                  { icon: Bell, label: 'Bildirimler', hint: 'Merkez hazırlanıyor', onClick: () => setAccountMenuOpen(false) },
                  { icon: Settings, label: 'Yetki ayarları', hint: 'Sonraki faz', onClick: () => setAccountMenuOpen(false) },
                ].map(({ icon: Icon, label, hint, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    style={{
                      width: '100%',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '10px 14px',
                      border: 0,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: 'transparent',
                      color: '#c8d8da',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={16} color="#00f0ff" />
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{label}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>{hint}</span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '11px 14px',
                    border: 0,
                    background: 'rgba(239,68,68,0.08)',
                    color: '#f87171',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  <LogOut size={16} /> Çıkış yap
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="admin-root" style={{ flex: 1, padding: 28, overflowX: 'hidden' }}>
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
