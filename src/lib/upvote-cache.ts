// Lokale Upvote-Cache, solange REST-API die Tabelle nicht kennt
export class UpvoteCache {
  private static STORAGE_KEY = 'local_upvotes';

  static get(eventId: string, sessionId: string, userId?: string): boolean {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const key = userId ? `user:${userId}:${eventId}` : `anon:${sessionId}:${eventId}`;
      return data[key] === true;
    } catch {
      return false;
    }
  }

  static set(eventId: string, upvoted: boolean, sessionId: string, userId?: string): void {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const key = userId ? `user:${userId}:${eventId}` : `anon:${sessionId}:${eventId}`;
      if (upvoted) {
        data[key] = true;
      } else {
        delete data[key];
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  static getCountForEvent(eventId: string): number {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return Object.keys(data).filter(
        (key) => key.includes(`:${eventId}`) && data[key] === true
      ).length;
    } catch {
      return 0;
    }
  }

  static getAllForEvent(eventId: string): string[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return Object.keys(data).filter(
        (key) => key.includes(`:${eventId}`) && data[key] === true
      );
    } catch {
      return [];
    }
  }
}
