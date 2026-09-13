/**
 * DEVFLOW — Contact Service
 * Validates and records contact / access requests (Supabase ready).
 */

class ContactService {
  constructor() {
    this.storageKey = 'devflow_contacts';
  }

  submitContactMessage({ name, email, message, company }) {
    if (!name || !name.trim()) {
      throw new Error('Please enter your name.');
    }
    if (!email || !email.trim() || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!message || !message.trim()) {
      throw new Error('Please provide a message or inquiry.');
    }

    const submission = {
      id: `contact-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      company: company ? company.trim() : 'Independent Developer',
      message: message.trim(),
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
