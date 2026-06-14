'use client';

import type { User } from '@supabase/supabase-js';

export const LOCAL_ADMIN_EMAIL = 'admin@example.com';
export const LOCAL_ADMIN_PASSWORD = 'admin123456';

const LOCAL_ADMIN_STORAGE_KEY = 'nav_local_admin_session';

function isLocalHost() {
  if (typeof window === 'undefined') return false;

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export function isLocalAdminEnabled() {
  return process.env.NODE_ENV === 'development' && isLocalHost();
}

export function isLocalAdminCredentials(email: string, password: string) {
  return (
    isLocalAdminEnabled() &&
    email.trim().toLowerCase() === LOCAL_ADMIN_EMAIL &&
    password === LOCAL_ADMIN_PASSWORD
  );
}

export function signInLocalAdmin() {
  if (!isLocalAdminEnabled()) return null;

  const user = createLocalAdminUser();
  localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, JSON.stringify({ email: user.email }));
  return user;
}

export function getLocalAdminUser() {
  if (!isLocalAdminEnabled()) return null;

  try {
    const value = localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY);
    if (!value) return null;

    const parsed = JSON.parse(value) as { email?: string };
    if (parsed.email !== LOCAL_ADMIN_EMAIL) return null;

    return createLocalAdminUser();
  } catch {
    return null;
  }
}

export function signOutLocalAdmin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
  }
}

function createLocalAdminUser(): User {
  const now = new Date().toISOString();

  return {
    id: 'local-admin',
    aud: 'authenticated',
    role: 'authenticated',
    email: LOCAL_ADMIN_EMAIL,
    app_metadata: {
      provider: 'local-admin',
      providers: ['local-admin'],
    },
    user_metadata: {
      name: 'Local Admin',
    },
    created_at: now,
    updated_at: now,
    confirmed_at: now,
    email_confirmed_at: now,
  } as User;
}
