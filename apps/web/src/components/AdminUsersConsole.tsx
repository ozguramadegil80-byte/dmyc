'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw, Search, ShieldCheck, Trash2, X, Users } from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserPayload,
} from '../lib/adminReviewApi';
import type { PublicAdminProfile } from '../lib/adminProfileStore';

type Props = { adminProfile: PublicAdminProfile; adminUsername: string; initialUsers: AdminUser[] };
type UserDraft = Required<AdminUserPayload>;
type AdminListItem = AdminUser & {
  avatarUrl?: string;
  isSystemAdmin?: boolean;
};
type AdminProfileDraft = {
  avatarUrl: string;
  email: string;
  fullName: string;
  password: string;
  passwordConfirmation: string;
  username: string;
};

const emptyDraft: UserDraft = {
  email: '', fullName: '', password: '', passwordConfirmation: '', phone: '', username: '',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function draftFromUser(user: AdminUser | null): UserDraft {
  if (!user) return emptyDraft;
  return { email: user.email ?? '', fullName: user.fullName ?? '', password: '',
    passwordConfirmation: '', phone: user.phone ?? '', username: user.username ?? '' };
}

function cleanDraft(draft: UserDraft, requirePassword: boolean): AdminUserPayload {
  const payload: AdminUserPayload = {
    email: draft.email.trim(), fullName: draft.fullName.trim(),
    phone: draft.phone.trim(), username: draft.username.trim(),
  };
  if (requirePassword || draft.password || draft.passwordConfirmation) {
    payload.password = draft.password;
    payload.passwordConfirmation = draft.passwordConfirmation;
  }
  return payload;
}

function fmt(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function fmtVehicles(user: AdminUser) {
  return user.vehicles.length ? user.vehicles.map(v => v.displayName).join(', ') : '-';
}

function fmtUserVehicles(user: AdminListItem) {
  return user.isSystemAdmin ? 'Panel yönetimi' : fmtVehicles(user);
}

function cleanAdminDraft(draft: AdminProfileDraft) {
  return {
    avatarUrl: safeText(draft.avatarUrl).trim(),
    email: safeText(draft.email).trim(),
    fullName: safeText(draft.fullName).trim(),
    password: draft.password ? draft.password : undefined,
    passwordConfirmation: draft.passwordConfirmation ? draft.passwordConfirmation : undefined,
    username: safeText(draft.username).trim(),
  };
}

function safeText(value: string | null | undefined) {
  return value ?? '';
}

// ── styles (tokens) ───────────────────────────────────────────────────────────

const BG = '#080f10';
const SURFACE = '#0d1a1c';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#c8d8da';
const MUTED = '#5e7a7e';
const CYAN = '#00f0ff';
const RED = '#ef4444';
const GREEN = '#16a34a';

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', background: '#0d1219', border: `1px solid ${BORDER}`,
  borderRadius: 6, color: '#dbe7ef', fontSize: 13, padding: '8px 10px',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', color: MUTED, fontSize: 11, marginBottom: 4, letterSpacing: '0.04em',
};

const usersTableGrid = '44px minmax(280px,1.55fr) minmax(220px,1fr) 56px minmax(132px,0.7fr) minmax(112px,0.6fr) 92px';

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  margin: 0,
  accentColor: CYAN,
  cursor: 'pointer',
  justifySelf: 'center',
};

function initials(user: AdminListItem) {
  const label = user.fullName || user.username || user.email || '?';
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

// ── component ─────────────────────────────────────────────────────────────────

export function AdminUsersConsole({ adminProfile: initialAdminProfile, adminUsername, initialUsers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastAutoOpenKey = useRef('');
  const [users, setUsers] = useState(initialUsers);
  const [adminProfile, setAdminProfile] = useState<AdminProfileDraft>({
    avatarUrl: safeText(initialAdminProfile.avatarUrl),
    email: safeText(initialAdminProfile.email),
    fullName: safeText(initialAdminProfile.fullName) || 'Panel Yöneticisi',
    password: '',
    passwordConfirmation: '',
    username: safeText(initialAdminProfile.username) || adminUsername,
  });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // modal state
  const [modal, setModal] = useState<{ user: AdminListItem | null } | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [adminDraft, setAdminDraft] = useState<AdminProfileDraft>(adminProfile);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | null>(null);

  const adminAccount = useMemo<AdminListItem>(() => ({
    id: '__admin_session__',
    username: adminProfile.username || adminUsername,
    email: adminProfile.email || null,
    phone: null,
    fullName: adminProfile.fullName || 'Panel Yöneticisi',
    createdAt: new Date(0).toISOString(),
    vehicleCount: 0,
    vehicles: [],
    lastTripAt: null,
    lastLoginAt: null,
    avatarUrl: adminProfile.avatarUrl,
    isSystemAdmin: true,
  }), [adminProfile, adminUsername]);

  const shouldOpenAdminProfile = searchParams.get('adminProfile') === '1';
  const adminProfileOpenKey = searchParams.toString();

  useEffect(() => {
    if (!shouldOpenAdminProfile || lastAutoOpenKey.current === adminProfileOpenKey) {
      return;
    }

    lastAutoOpenKey.current = adminProfileOpenKey;
    setAdminDraft(adminProfile);
    setModal({ user: adminAccount });
    setModalMsg(null);
    router.replace('/admin/users', { scroll: false });
  }, [adminAccount, adminProfile, adminProfileOpenKey, router, shouldOpenAdminProfile]);

  const rows = useMemo<AdminListItem[]>(() => [adminAccount, ...users], [adminAccount, users]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return rows;
    return rows.filter(u =>
      (u.fullName ?? '').toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.isSystemAdmin ? 'admin panel yönetici' : '').includes(q) ||
      (u.phone ?? '').toLowerCase().includes(q)
    );
  }, [query, rows]);

  const totalVehicleCount = useMemo(() => users.reduce((s, u) => s + Number(u.vehicleCount ?? 0), 0), [users]);
  const activeTripCount   = useMemo(() => users.filter(u => Boolean(u.lastTripAt)).length, [users]);

  // ── refresh ──────────────────────────────────────────────────────────────

  async function refresh() {
    setIsBusy(true);
    setMessage(null);
    try {
      setUsers(await fetchAdminUsers());
      setSelected(new Set());
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Yenilenemedi.', ok: false });
    } finally { setIsBusy(false); }
  }

  // ── selection ─────────────────────────────────────────────────────────────

  function toggleOne(id: string) {
    if (id === adminAccount.id) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const deletable = filtered.filter(u => !u.isSystemAdmin).map(u => u.id);
    setSelected(prev =>
      deletable.every(id => prev.has(id)) ? new Set() : new Set(deletable)
    );
  }

  // ── bulk delete ───────────────────────────────────────────────────────────

  async function bulkDelete() {
    if (!window.confirm(`${selected.size} kullanıcı kaldırılsın mı?`)) return;
    setIsBusy(true);
    setMessage(null);
    try {
      await Promise.all([...selected].map(id => deleteAdminUser(id)));
      const next = await fetchAdminUsers();
      setUsers(next);
      setSelected(new Set());
      setMessage({ text: `${selected.size} kullanıcı kaldırıldı.`, ok: true });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Silme başarısız.', ok: false });
    } finally { setIsBusy(false); }
  }

  // ── modal open/close ──────────────────────────────────────────────────────

  function openEdit(user: AdminListItem) {
    setModal({ user });
    if (user.isSystemAdmin) {
      setAdminDraft(adminProfile);
    } else {
      setDraft(draftFromUser(user));
    }
    setModalMsg(null);
  }

  function openNew() {
    setModal({ user: null });
    setDraft(emptyDraft);
    setAdminDraft(adminProfile);
    setModalMsg(null);
  }

  function closeModal() { setModal(null); setModalMsg(null); }

  // ── modal save ────────────────────────────────────────────────────────────

  async function modalSave() {
    setModalBusy(true);
    setModalMsg(null);
    try {
      if (modal?.user?.isSystemAdmin) {
        const response = await fetch('/api/admin-auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanAdminDraft(adminDraft)),
        });

        const result = (await response.json()) as Partial<PublicAdminProfile> & { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? 'Admin profili güncellenemedi.');
        }

        setAdminProfile({
          avatarUrl: result.avatarUrl ?? '',
          email: result.email ?? '',
          fullName: result.fullName ?? 'Panel Yöneticisi',
          password: '',
          passwordConfirmation: '',
          username: result.username ?? adminDraft.username,
        });
        closeModal();
        setMessage({ text: adminDraft.password ? 'Admin şifresi güncellendi.' : 'Admin profili güncellendi.', ok: true });
        return;
      }
      if (modal?.user) {
        await updateAdminUser(modal.user.id, cleanDraft(draft, false));
      } else {
        await createAdminUser(cleanDraft(draft, true));
      }
      setUsers(await fetchAdminUsers());
      closeModal();
      setMessage({ text: modal?.user ? 'Güncellendi.' : 'Kullanıcı eklendi.', ok: true });
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally { setModalBusy(false); }
  }

  // ── modal delete (single) ─────────────────────────────────────────────────

  async function modalDelete() {
    if (!modal?.user) return;
    if (modal.user.isSystemAdmin) {
      setModalMsg('Admin hesabı bu ekrandan silinemez.');
      return;
    }
    if (!window.confirm(`${modal.user.email ?? modal.user.username} kaldırılsın mı?`)) return;
    setModalBusy(true);
    try {
      await deleteAdminUser(modal.user.id);
      setUsers(await fetchAdminUsers());
      setSelected(prev => { const n = new Set(prev); n.delete(modal.user!.id); return n; });
      closeModal();
      setMessage({ text: 'Kullanıcı kaldırıldı.', ok: true });
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : 'Kaldırma başarısız.');
    } finally { setModalBusy(false); }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ color: TEXT }}>

      {/* ── header + stats row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dbfcff' }}>Kullanıcılar</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'toplam', value: rows.length },
              { label: 'araç', value: totalVehicleCount },
              { label: 'trip', value: activeTripCount },
            ].map(s => (
              <span key={s.label} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6,
                padding: '4px 12px', fontSize: 13, color: TEXT,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <strong style={{ color: CYAN }}>{s.value}</strong>
                <span style={{ color: MUTED }}>{s.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} disabled={isBusy} style={ghostBtn}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button onClick={openNew} style={cyanBtn}>
            <Plus size={14} /> Ekle
          </button>
        </div>
      </div>

      {/* ── message ── */}
      {message && (
        <div style={{
          marginBottom: 14, padding: '9px 14px', borderRadius: 6, fontSize: 13,
          background: message.ok ? 'rgba(22,163,74,0.12)' : 'rgba(239,68,68,0.12)',
          color: message.ok ? '#4ade80' : '#f87171',
          border: `1px solid ${message.ok ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* ── toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
          <input
            placeholder="Ara (ad, e-posta, tel…)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>
        {selected.size > 0 && (
          <button onClick={bulkDelete} disabled={isBusy} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'rgba(239,68,68,0.12)', border: `1px solid rgba(239,68,68,0.35)`,
            borderRadius: 6, color: '#f87171', fontSize: 13, cursor: 'pointer',
          }}>
            <Trash2 size={14} /> {selected.size} seçili sil
          </button>
        )}
      </div>

      {/* ── table ── */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ minWidth: 1040 }}>
        {/* head */}
        <div style={{
          display: 'grid', gridTemplateColumns: usersTableGrid, columnGap: 14, alignItems: 'center',
          padding: '8px 14px', borderBottom: `1px solid ${BORDER}`,
          fontSize: 11, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <span style={{ display: 'grid', placeItems: 'center' }}>
            <input
              type="checkbox"
              checked={filtered.some(u => !u.isSystemAdmin) && filtered.filter(u => !u.isSystemAdmin).every(u => selected.has(u.id))}
              onChange={toggleAll}
              style={checkboxStyle}
            />
          </span>
          <span>Ad Soyad / E-posta</span>
          <span>Araçlar</span>
          <span style={{ textAlign: 'center' }}>Sayı</span>
          <span>Son Trip</span>
          <span>Son Giriş</span>
          <span></span>
        </div>

        {/* rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>
            <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Sonuç bulunamadı.</p>
          </div>
        ) : filtered.map((user, i) => (
          <div
            key={user.id}
            style={{
              display: 'grid', gridTemplateColumns: usersTableGrid, columnGap: 14,
              padding: '9px 14px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
              background: selected.has(user.id) ? 'rgba(0,240,255,0.04)' : 'transparent',
              transition: 'background 0.12s',
            }}
          >
            <span style={{ display: 'grid', placeItems: 'center' }}>
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                onChange={() => toggleOne(user.id)}
                disabled={user.isSystemAdmin}
                style={{ ...checkboxStyle, opacity: user.isSystemAdmin ? 0.35 : 1, cursor: user.isSystemAdmin ? 'not-allowed' : 'pointer' }}
              />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  flex: '0 0 34px',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(0,240,255,0.1)',
                  border: '1px solid rgba(0,240,255,0.28)',
                  color: CYAN,
                  fontSize: 12,
                  fontWeight: 800,
                  overflow: 'hidden',
                }}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.isSystemAdmin ? <ShieldCheck size={16} /> : initials(user)
                )}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#dbe7ef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.fullName || user.username || 'İsimsiz'}
                </div>
                <div style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.isSystemAdmin ? `${user.username} · panel hesabı` : (user.email ?? user.phone ?? '-')}
                </div>
              </div>
            </span>
            <span style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fmtUserVehicles(user)}
            </span>
            <span style={{ textAlign: 'center', fontSize: 13, color: user.vehicleCount > 0 ? TEXT : MUTED }}>
              {user.vehicleCount}
            </span>
            <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{fmt(user.lastTripAt)}</span>
            <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{fmt(user.lastLoginAt)}</span>
            <span style={{ justifySelf: 'end' }}>
              <button
                onClick={() => openEdit(user)}
                style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 5,
                  background: 'rgba(0,240,255,0.06)', border: `1px solid rgba(0,240,255,0.2)`,
                  color: CYAN, cursor: 'pointer',
                }}
              >
                Düzenle
              </button>
            </span>
          </div>
        ))}
        </div>
      </div>

      {/* ── modal ── */}
      {modal !== null && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: '#0b1517', border: `1px solid ${BORDER}`, borderRadius: 12,
            width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          }}>
            {/* modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {modal.user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                </p>
                <h2 style={{ margin: 0, fontSize: 16, color: '#dbfcff', fontWeight: 700 }}>
                  {modal.user ? (modal.user.fullName || modal.user.username || modal.user.email || '…') : 'Kullanıcı ekle'}
                </h2>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* modal body */}
            <div style={{ padding: '20px 20px 0' }}>
              {modal.user?.isSystemAdmin ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <label>
                    <span style={labelStyle}>Profil Fotoğrafı URL</span>
                    <input
                      style={inputStyle}
                      placeholder="/uploads/admin/profile.png"
                      value={adminDraft.avatarUrl}
                      onChange={e => setAdminDraft(d => ({ ...d, avatarUrl: e.target.value }))}
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label>
                      <span style={labelStyle}>Kullanıcı adı</span>
                      <input style={inputStyle} value={adminDraft.username} onChange={e => setAdminDraft(d => ({ ...d, username: e.target.value }))} />
                    </label>
                    <label>
                      <span style={labelStyle}>Ad Soyad</span>
                      <input style={inputStyle} value={adminDraft.fullName} onChange={e => setAdminDraft(d => ({ ...d, fullName: e.target.value }))} />
                    </label>
                    <label>
                      <span style={labelStyle}>E-posta</span>
                      <input style={inputStyle} value={adminDraft.email} onChange={e => setAdminDraft(d => ({ ...d, email: e.target.value }))} />
                    </label>
                    <label>
                      <span style={labelStyle}>Yeni Şifre</span>
                      <input type="password" style={inputStyle} value={adminDraft.password} onChange={e => setAdminDraft(d => ({ ...d, password: e.target.value }))} />
                    </label>
                  </div>
                  <label>
                    <span style={labelStyle}>Şifre Tekrar</span>
                    <input type="password" style={inputStyle} value={adminDraft.passwordConfirmation} onChange={e => setAdminDraft(d => ({ ...d, passwordConfirmation: e.target.value }))} />
                  </label>
                  <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
                    Şifre değişirse bir sonraki girişte yeni admin şifresi geçerli olur.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Kullanıcı adı', key: 'username' as const },
                    { label: 'Ad Soyad',      key: 'fullName'  as const },
                    { label: 'E-posta',        key: 'email'    as const },
                    { label: 'Telefon',        key: 'phone'    as const },
                  ].map(f => (
                    <label key={f.key}>
                      <span style={labelStyle}>{f.label}</span>
                      <input
                        style={inputStyle}
                        value={draft[f.key]}
                        onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      />
                    </label>
                  ))}
                  <label>
                    <span style={labelStyle}>{modal.user ? 'Yeni Şifre' : 'Şifre'}</span>
                    <input type="password" style={inputStyle} value={draft.password}
                      onChange={e => setDraft(d => ({ ...d, password: e.target.value }))} />
                  </label>
                  <label>
                    <span style={labelStyle}>Şifre Tekrar</span>
                    <input type="password" style={inputStyle} value={draft.passwordConfirmation}
                      onChange={e => setDraft(d => ({ ...d, passwordConfirmation: e.target.value }))} />
                  </label>
                </div>
              )}

              {modal.user && !modal.user.isSystemAdmin && (
                <div style={{
                  marginTop: 16, padding: '12px 14px', background: BG,
                  borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12,
                }}>
                  <div style={{ color: MUTED, marginBottom: 4 }}>Araçları</div>
                  <div style={{ color: TEXT }}>{fmtVehicles(modal.user)}</div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    <span style={{ color: MUTED }}>Son trip: <span style={{ color: TEXT }}>{fmt(modal.user.lastTripAt)}</span></span>
                    <span style={{ color: MUTED }}>Son giriş: <span style={{ color: TEXT }}>{fmt(modal.user.lastLoginAt)}</span></span>
                  </div>
                </div>
              )}

              {modalMsg && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#f87171', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                  {modalMsg}
                </div>
              )}
            </div>

            {/* modal footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
              <div>
                {modal.user && !modal.user.isSystemAdmin && (
                  <button onClick={modalDelete} disabled={modalBusy} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`,
                    borderRadius: 6, color: '#f87171', fontSize: 13, cursor: 'pointer',
                  }}>
                    <Trash2 size={14} /> Kaldır
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeModal} style={ghostBtn}>İptal</button>
                <button onClick={modalSave} disabled={modalBusy} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                  background: GREEN, border: 'none', borderRadius: 6,
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {modalBusy ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── button presets ────────────────────────────────────────────────────────────

const ghostBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6, color: '#8fa8aa', fontSize: 13, cursor: 'pointer',
};

const cyanBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
  background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.25)',
  borderRadius: 6, color: '#00f0ff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
