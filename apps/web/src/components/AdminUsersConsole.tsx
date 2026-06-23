'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserPayload,
} from '../lib/adminReviewApi';

type Props = {
  initialUsers: AdminUser[];
};

type UserDraft = Required<AdminUserPayload>;

const emptyDraft: UserDraft = {
  email: '',
  fullName: '',
  password: '',
  passwordConfirmation: '',
  phone: '',
  username: '',
};

export function AdminUsersConsole({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState(initialUsers[0]?.id ?? 'new');
  const [draft, setDraft] = useState<UserDraft>(draftFromUser(initialUsers[0] ?? null));
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const totalVehicleCount = useMemo(
    () => users.reduce((total, user) => total + Number(user.vehicleCount ?? 0), 0),
    [users],
  );
  const activeTripCount = useMemo(
    () => users.filter((user) => Boolean(user.lastTripAt)).length,
    [users],
  );

  const refresh = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
      if (!nextUsers.some((user) => user.id === selectedUserId)) {
        setSelectedUserId(nextUsers[0]?.id ?? 'new');
        setDraft(draftFromUser(nextUsers[0] ?? null));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kullanıcılar yenilenemedi.');
    } finally {
      setIsBusy(false);
    }
  };

  const selectUser = (user: AdminUser) => {
    setSelectedUserId(user.id);
    setDraft(draftFromUser(user));
    setMessage(null);
  };

  const openNewUser = () => {
    setSelectedUserId('new');
    setDraft(emptyDraft);
    setMessage(null);
  };

  const save = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      if (selectedUserId === 'new') {
        await createAdminUser(cleanDraft(draft, true));
        setMessage('Kullanıcı eklendi.');
      } else {
        await updateAdminUser(selectedUserId, cleanDraft(draft, false));
        setMessage('Kullanıcı güncellendi.');
      }

      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
      const nextSelected = selectedUserId === 'new' ? nextUsers[0] ?? null : nextUsers.find((user) => user.id === selectedUserId) ?? null;
      setSelectedUserId(nextSelected?.id ?? 'new');
      setDraft(draftFromUser(nextSelected));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kayıt işlemi başarısız.');
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedUser || !window.confirm(`${selectedUser.email ?? selectedUser.username} kullanıcısı kaldırılsın mı?`)) {
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      await deleteAdminUser(selectedUser.id);
      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
      setSelectedUserId(nextUsers[0]?.id ?? 'new');
      setDraft(draftFromUser(nextUsers[0] ?? null));
      setMessage('Kullanıcı kaldırıldı.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kullanıcı kaldırılamadı.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="admin-users-shell">
      <section className="admin-users-page">
        <header className="admin-users-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Kullanıcılar</h1>
          </div>
          <div className="admin-users-actions">
            <button className="icon-button" onClick={openNewUser} type="button">
              <Plus size={16} /> Ekle
            </button>
            <button className="icon-button" disabled={isBusy} onClick={refresh} type="button">
              <RefreshCw size={16} /> Yenile
            </button>
          </div>
        </header>

        <div className="admin-users-stats">
          <StatCard label="Kullanıcı" value={users.length} />
          <StatCard label="Araç bağı" value={totalVehicleCount} />
          <StatCard label="Trip kaydı olan" value={activeTripCount} />
        </div>

        {message ? <p className="admin-users-message">{message}</p> : null}

        <div className="admin-users-layout">
          <section className="admin-users-list">
            <div className="admin-users-list-head">
              <span>Kullanıcı</span>
              <span>Araçları</span>
              <span>Sayı</span>
              <span>Son trip</span>
              <span>İşlem</span>
            </div>
            {users.map((user) => (
              <button
                className={`admin-users-row ${selectedUserId === user.id ? 'selected' : ''}`}
                key={user.id}
                onClick={() => selectUser(user)}
                type="button"
              >
                <span>
                  <strong>{user.fullName || user.username || 'İsimsiz kullanıcı'}</strong>
                  <small>{user.email ?? '-'}</small>
                </span>
                <span className="admin-users-vehicles">{formatVehicles(user)}</span>
                <span className="admin-users-count">{user.vehicleCount}</span>
                <span>{formatDate(user.lastTripAt)}</span>
                <span className="admin-users-edit"><Pencil size={15} /> Düzenle</span>
              </button>
            ))}
            {users.length === 0 ? (
              <div className="admin-users-empty">
                <Users size={30} />
                <p>Kullanıcı kaydı yok.</p>
              </div>
            ) : null}
          </section>

          <aside className="admin-users-editor">
            <div className="admin-users-editor-head">
              <div>
                <p className="eyebrow">{selectedUserId === 'new' ? 'Yeni kayıt' : 'Düzenle'}</p>
                <h2>{selectedUserId === 'new' ? 'Kullanıcı ekle' : draft.email || draft.username}</h2>
              </div>
              {selectedUser ? (
                <button className="danger-icon-button" disabled={isBusy} onClick={remove} type="button">
                  <Trash2 size={16} /> Kaldır
                </button>
              ) : null}
            </div>

            <div className="admin-users-form">
              <UserInput label="Kullanıcı adı" value={draft.username} onChange={(value) => setDraft((current) => ({ ...current, username: value }))} />
              <UserInput label="Ad Soyad" value={draft.fullName} onChange={(value) => setDraft((current) => ({ ...current, fullName: value }))} />
              <UserInput label="E-posta" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
              <UserInput label="Telefon" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
              <UserInput label={selectedUserId === 'new' ? 'Şifre' : 'Yeni şifre'} type="password" value={draft.password} onChange={(value) => setDraft((current) => ({ ...current, password: value }))} />
              <UserInput label="Şifre doğrulama" type="password" value={draft.passwordConfirmation} onChange={(value) => setDraft((current) => ({ ...current, passwordConfirmation: value }))} />
            </div>

            {selectedUser ? (
              <div className="admin-users-user-summary">
                <p className="eyebrow">Araçları</p>
                <p>{formatVehicles(selectedUser)}</p>
                <small>Son trip: {formatDate(selectedUser.lastTripAt)}</small>
              </div>
            ) : null}

            <button className="primary-button" disabled={isBusy} onClick={save} type="button">
              {isBusy ? 'Kaydediliyor' : selectedUserId === 'new' ? 'Kullanıcı ekle' : 'Kaydet'}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-users-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UserInput({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label>
      {label}
      <input onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function draftFromUser(user: AdminUser | null): UserDraft {
  if (!user) {
    return emptyDraft;
  }

  return {
    email: user.email ?? '',
    fullName: user.fullName ?? '',
    password: '',
    passwordConfirmation: '',
    phone: user.phone ?? '',
    username: user.username ?? '',
  };
}

function cleanDraft(draft: UserDraft, requirePassword: boolean): AdminUserPayload {
  const payload: AdminUserPayload = {
    email: draft.email.trim(),
    fullName: draft.fullName.trim(),
    phone: draft.phone.trim(),
    username: draft.username.trim(),
  };

  if (requirePassword || draft.password || draft.passwordConfirmation) {
    payload.password = draft.password;
    payload.passwordConfirmation = draft.passwordConfirmation;
  }

  return payload;
}

function formatVehicles(user: AdminUser) {
  if (!user.vehicles.length) {
    return '-';
  }

  return user.vehicles.map((vehicle) => vehicle.displayName).join(', ');
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
