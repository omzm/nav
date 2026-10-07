'use client';

import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

const UserContext = createContext<User | null>(null);

export { UserContext };
