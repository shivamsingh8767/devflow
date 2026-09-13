/**
 * DEVFLOW — Google Workspace Authentication Service
 * Uses Firebase Auth and GoogleAuthProvider to obtain Google Workspace OAuth tokens.
 * In-memory caching for OAuth access tokens as required by Workspace integration guidelines.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.memberships',
  'https://www.googleapis.com/auth/chat.memberships.readonly'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent'
});

class GoogleAuthService {
  constructor() {
    this.auth = auth;
    this.cachedAccessToken = null;
    this.currentUser = null;
    this.isSigningIn = false;
    this.subscribers = new Set();
    this.init();
  }

  init() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (!user) {
        this.cachedAccessToken = null;
      }
      this.notify();
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.currentUser, this.cachedAccessToken);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.currentUser, this.cachedAccessToken);
      } catch (e) {
        console.error('GoogleAuth subscriber error:', e);
      }
    });
  }

  getGoogleUser() {
    return this.currentUser;
  }

  getAccessToken() {
    return this.cachedAccessToken;
  }

  isConnected() {
    return Boolean(this.currentUser && this.cachedAccessToken);
  }

  async signInWithGoogle() {
    try {
      this.isSigningIn = true;
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Failed to retrieve Google Workspace access token.');
      }

      this.cachedAccessToken = credential.accessToken;
      this.currentUser = result.user;
      this.notify();
      return {
        user: this.currentUser,
        accessToken: this.cachedAccessToken
      };
    } catch (error) {
      console.error('Google Chat OAuth Sign-In Error:', error);
      throw error;
    } finally {
      this.isSigningIn = false;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.cachedAccessToken = null;
      this.currentUser = null;
      this.notify();
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
      throw error;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export { SCOPES };
