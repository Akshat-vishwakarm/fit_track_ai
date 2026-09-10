import { db } from '../db/database';
import type { User } from '../types';

const CURRENT_USER_KEY = 'fittrack_current_user_id';

export const authService = {
  async getUsers(): Promise<User[]> {
    return await db.users.toArray();
  },

  async getCurrentUser(): Promise<User | null> {
    let userId = localStorage.getItem(CURRENT_USER_KEY);
    if (!userId) {
      const users = await this.getUsers();
      if (users.length > 0) {
        userId = users[0].id;
        localStorage.setItem(CURRENT_USER_KEY, userId);
      } else {
        // Create initial default user profile with 0 data
        const newUser = await this.createUser('Default Athlete', 'athlete@fittrack.ai');
        return newUser;
      }
    }
    const user = await db.users.get(userId);
    if (!user) {
      const users = await this.getUsers();
      if (users.length > 0) {
        localStorage.setItem(CURRENT_USER_KEY, users[0].id);
        return users[0];
      }
      return await this.createUser('Default Athlete', 'athlete@fittrack.ai');
    }
    return user;
  },

  async createUser(name: string, email: string): Promise<User> {
    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name,
      email,
      created_at: new Date().toISOString(),
    };
    await db.users.add(newUser);
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    return newUser;
  },

  async switchUser(userId: string): Promise<User | null> {
    const user = await db.users.get(userId);
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      return user;
    }
    return null;
  },

  async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser();
    return user ? user.id : 'usr_default';
  }
};
