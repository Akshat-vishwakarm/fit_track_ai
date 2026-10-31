import { db } from '../db/database';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { firestoreDb } from '../firebase/config';
import type { CalendarNote } from '../types';

export const calendarNoteService = {
  async getNoteByDate(userId: string, date: string): Promise<CalendarNote | null> {
    const note = await db.calendarNotes
      .where({ user_id: userId, date })
      .first();
    return note || null;
  },

  async getAllNotes(userId: string): Promise<CalendarNote[]> {
    return await db.calendarNotes
      .where('user_id')
      .equals(userId)
      .toArray();
  },

  async saveNote(
    userId: string,
    date: string,
    noteText: string,
    weight?: number,
    activity?: string,
    tags?: string[]
  ): Promise<CalendarNote> {
    const existing = await this.getNoteByDate(userId, date);

    if (existing) {
      const updated: CalendarNote = {
        ...existing,
        note: noteText,
        weight: weight !== undefined ? weight : existing.weight,
        activity: activity !== undefined ? activity : existing.activity,
        tags: tags || existing.tags,
        updated_at: new Date().toISOString(),
      };
      await db.calendarNotes.put(updated);

      try {
        const docRef = doc(firestoreDb, 'users', userId, 'calendarNotes', existing.id);
        setDoc(docRef, updated, { merge: true }).catch(() => {});
      } catch {
        // offline
      }
      return updated;
    } else {
      const newNote: CalendarNote = {
        id: 'cn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        user_id: userId,
        date,
        note: noteText,
        weight,
        activity,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.calendarNotes.put(newNote);

      try {
        const docRef = doc(firestoreDb, 'users', userId, 'calendarNotes', newNote.id);
        setDoc(docRef, newNote, { merge: true }).catch(() => {});
      } catch {
        // offline
      }
      return newNote;
    }
  },

  async deleteNote(userId: string, id: string): Promise<void> {
    await db.calendarNotes.delete(id);
    try {
      const docRef = doc(firestoreDb, 'users', userId, 'calendarNotes', id);
      deleteDoc(docRef).catch(() => {});
    } catch {
      // offline
    }
  },
};

