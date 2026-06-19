/**
 * Anonymous guest identity. Lets a customer see their own order history and
 * reorder without ever creating an account. A random id is generated once and
 * persisted in localStorage; we also remember the last phone number they used
 * so history works across devices that share a number.
 */
const GUEST_ID_KEY = 'orderlink.guestId';
const GUEST_PHONE_KEY = 'orderlink.guestPhone';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Stable per-browser guest id, created on first use. */
export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage disabled — fall back to an ephemeral id.
    return randomId();
  }
}

export function getGuestPhone(): string {
  try {
    return localStorage.getItem(GUEST_PHONE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberGuestPhone(phone: string): void {
  try {
    const trimmed = phone.trim();
    if (trimmed) localStorage.setItem(GUEST_PHONE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}
