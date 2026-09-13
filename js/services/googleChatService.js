/**
 * DEVFLOW — Google Chat API Service
 * Interacts with Google Chat REST API endpoints:
 * - https://chat.googleapis.com/v1/spaces
 * - https://chat.googleapis.com/v1/{spaceName}/messages
 * - https://chat.googleapis.com/v1/{spaceName}/members
 */

import { googleAuthService } from './googleAuthService.js';

class GoogleChatService {
  constructor() {
    this.spaces = [];
    this.activeSpace = null;
    this.messages = [];
    this.members = [];
    this.isLoadingSpaces = false;
    this.isLoadingMessages = false;
    this.error = null;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback({
      spaces: this.spaces,
      activeSpace: this.activeSpace,
      messages: this.messages,
      members: this.members,
      isLoadingSpaces: this.isLoadingSpaces,
      isLoadingMessages: this.isLoadingMessages,
      error: this.error
    });
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb({
          spaces: this.spaces,
          activeSpace: this.activeSpace,
          messages: this.messages,
          members: this.members,
          isLoadingSpaces: this.isLoadingSpaces,
          isLoadingMessages: this.isLoadingMessages,
          error: this.error
        });
      } catch (e) {
        console.error('GoogleChat subscriber error:', e);
      }
    });
  }

  getHeaders() {
    const token = googleAuthService.getAccessToken();
    if (!token) {
      throw new Error('Google Chat is not connected. Please sign in with Google first.');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * List all Google Chat spaces accessible by the user
   */
  async fetchSpaces() {
    if (!googleAuthService.isConnected()) {
      this.spaces = [];
      this.activeSpace = null;
      this.messages = [];
      this.notify();
      return [];
    }

    this.isLoadingSpaces = true;
    this.error = null;
    this.notify();

    try {
      const headers = this.getHeaders();
      const res = await fetch('https://chat.googleapis.com/v1/spaces', { headers });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Failed to fetch Google Chat spaces (${res.status})`
        );
      }

      const data = await res.json();
      this.spaces = data.spaces || [];

      // Auto-select first space if activeSpace is not set or not in list
      if (this.spaces.length > 0) {
        if (!this.activeSpace || !this.spaces.some((s) => s.name === this.activeSpace.name)) {
          this.activeSpace = this.spaces[0];
          await this.fetchMessages(this.activeSpace.name);
        }
      } else {
        this.activeSpace = null;
        this.messages = [];
      }

      return this.spaces;
    } catch (err) {
      console.error('Fetch Google Chat spaces error:', err);
      this.error = err.message || 'Error connecting to Google Chat.';
      return [];
    } finally {
      this.isLoadingSpaces = false;
      this.notify();
    }
  }

  /**
   * Set active space and fetch its messages
   */
  async setActiveSpace(space) {
    this.activeSpace = space;
    this.notify();
    if (space?.name) {
      await this.fetchMessages(space.name);
      await this.fetchMembers(space.name);
    }
  }

  /**
   * List messages in a space
   */
  async fetchMessages(spaceName) {
    if (!spaceName) return [];
    this.isLoadingMessages = true;
    this.notify();

    try {
      const headers = this.getHeaders();
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=40`, {
        headers
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Failed to fetch messages (${res.status})`
        );
      }

      const data = await res.json();
      // Google Chat messages are returned latest first or in chronological order; let's sort them ascending by createTime
      const rawMessages = data.messages || [];
      this.messages = rawMessages.sort((a, b) => {
        const tA = new Date(a.createTime || 0).getTime();
        const tB = new Date(b.createTime || 0).getTime();
        return tA - tB;
      });

      return this.messages;
    } catch (err) {
      console.error(`Fetch messages for ${spaceName} error:`, err);
      this.error = err.message;
      this.messages = [];
      return [];
    } finally {
      this.isLoadingMessages = false;
      this.notify();
    }
  }

  /**
   * List members of a space
   */
  async fetchMembers(spaceName) {
    if (!spaceName) return [];
    try {
      const headers = this.getHeaders();
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/members`, { headers });
      if (res.ok) {
        const data = await res.json();
        this.members = data.memberships || [];
        this.notify();
        return this.members;
      }
    } catch (err) {
      console.warn('Fetch space members error:', err);
    }
    return [];
  }

  /**
   * Send a text message to a space
   */
  async sendMessage(spaceName, text) {
    if (!spaceName) throw new Error('No active Google Chat space selected.');
    if (!text || !text.trim()) throw new Error('Message text cannot be empty.');

    const headers = this.getHeaders();
    const payload = {
      text: text.trim()
    };

    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to send message (${res.status})`);
    }

    const newMessage = await res.json();
    this.messages.push(newMessage);
    this.notify();
    return newMessage;
  }

  /**
   * Create a new space
   */
  async createSpace(displayName, spaceType = 'SPACE') {
    if (!displayName || !displayName.trim()) {
      throw new Error('Space name cannot be empty.');
    }

    const headers = this.getHeaders();
    const payload = {
      displayName: displayName.trim(),
      spaceType: spaceType
    };

    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to create space (${res.status})`);
    }

    const newSpace = await res.json();
    this.spaces.unshift(newSpace);
    this.activeSpace = newSpace;
    this.messages = [];
    this.notify();
    return newSpace;
  }
}

export const googleChatService = new GoogleChatService();
