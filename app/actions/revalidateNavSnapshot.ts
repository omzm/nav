'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function revalidateNavSnapshot() {
  revalidateTag('nav-snapshot', { expire: 0 });
  revalidatePath('/');
}
