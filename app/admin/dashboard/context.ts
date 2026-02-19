'use client';

import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

const UserContext = createContext<User | null>(null);

export function useAdminUser() {
  return useContext(UserContext);
}

export { UserContext };
