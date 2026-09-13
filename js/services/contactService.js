/**
 * DEVFLOW — Contact Service
 * Validates and records contact / access inquiries backed by Supabase (public.contact_messages).
 * 
 * Schema:
 * public.contact_messages (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name TEXT NOT NULL,
 *   email TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * )
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

class ContactService {
  constructor() {
    this.storageKey = 'devflow_local_contact_messages';
  }

  async submitContactMessage({ name, email, message, company }) {
    if (!name || !name.trim()) {
      throw new Error('Please enter your name.');
    }
    const cleanEmail = email ? email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid work email address.');
    }
    if (!message || !message.trim()) {
      throw new Error('Please provide a message or inquiry.');
    }

    const payload = {
      name: name.trim(),
      email: cleanEmail,
      message: company?.trim() ? `[Company: ${company.trim()}] ${message.trim()}` : message.trim()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .insert([payload])
          .select()
          .single();

        if (error) {
          // If table schema expects company separately, fallback to inserting with company field
          const fallbackRes = await supabase
            .from('contact_messages')
            .insert([{ name: payload.name, email: payload.email, message: message.trim() }]);
          
          if (fallbackRes.error) {
            console.warn('Supabase contact submission notice:', fallbackRes.error);
          }
        }
        return data || payload;
      } catch (err) {
        console.warn('Supabase contact insert notice:', err);
      }
    }

    // Local fallback persistence
    const submission = {
      id: `contact-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      existing.push(submission);
      localStorage.setItem(this.storageKey, JSON.stringify(existing));
    } catch (e) {
      console.warn('Could not persist contact submission to localStorage', e);
    }

    return submission;
  }
}

export const contactService = new ContactService();
