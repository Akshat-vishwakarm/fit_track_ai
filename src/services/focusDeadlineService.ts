import { db } from '../db/database';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../firebase/config';
import type { FocusDeadline } from '../types';

export const focusDeadlineService = {
  async getActiveDeadline(userId: string): Promise<FocusDeadline | null> {
    const list = await this.getAllDeadlines(userId);
    const activeList = list.filter((d) => d.active);
    if (activeList.length === 0) return null;

    // Return the one with earliest target_date
    return activeList.sort((a, b) => a.target_date.localeCompare(b.target_date))[0];
  },

  async getAllDeadlines(userId: string): Promise<FocusDeadline[]> {
    try {
      const colRef = collection(firestoreDb, 'users', userId, 'focusDeadlines');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const cloudDeadlines = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FocusDeadline));
        for (const dl of cloudDeadlines) {
          await db.focusDeadlines.put(dl).catch(() => {});
        }
        return cloudDeadlines;
      }
    } catch {
      // offline fallback
    }

    return await db.focusDeadlines
      .where('user_id')
      .equals(userId)
      .toArray();
  },

  async setDeadline(
    userId: string,
    data: {
      title: string;
      target_date: string;
      category?: FocusDeadline['category'];
      target_note?: string;
    }
  ): Promise<FocusDeadline> {
    // Deactivate previous active deadlines to ensure single high-focus active target
    const existing = await this.getAllDeadlines(userId);

    for (const d of existing) {
      if (d.active) {
        await db.focusDeadlines.update(d.id, { active: false });
        try {
          const docRef = doc(firestoreDb, 'users', userId, 'focusDeadlines', d.id);
          await setDoc(docRef, { active: false }, { merge: true }).catch(() => {});
        } catch {
          // offline
        }
      }
    }

    const newDeadline: FocusDeadline = {
      id: 'fd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      title: data.title,
      target_date: data.target_date,
      category: data.category || 'fitness',
      target_note: data.target_note || '',
      active: true,
      created_at: new Date().toISOString(),
    };

    await db.focusDeadlines.put(newDeadline);

    // Sync to Firestore
    try {
      const docRef = doc(firestoreDb, 'users', userId, 'focusDeadlines', newDeadline.id);
      await setDoc(docRef, newDeadline, { merge: true }).catch(() => {});
    } catch {
      // offline resilience
    }

    return newDeadline;
  },

  async updateDeadline(id: string, updates: Partial<FocusDeadline>, userId?: string): Promise<void> {
    await db.focusDeadlines.update(id, updates);
    if (userId) {
      try {
        const docRef = doc(firestoreDb, 'users', userId, 'focusDeadlines', id);
        await setDoc(docRef, updates, { merge: true }).catch(() => {});
      } catch {
        // ignore
      }
    }
  },

  async deleteDeadline(userId: string, id: string): Promise<void> {
    await db.focusDeadlines.delete(id);
    try {
      const docRef = doc(firestoreDb, 'users', userId, 'focusDeadlines', id);
      await deleteDoc(docRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  async completeDeadline(userId: string, id: string): Promise<void> {
    await db.focusDeadlines.update(id, { active: false });
    try {
      const docRef = doc(firestoreDb, 'users', userId, 'focusDeadlines', id);
      await setDoc(docRef, { active: false }, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }
  },
};
