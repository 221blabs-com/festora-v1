/**
 * Utility functions to generate and format clean, 6-character ticket IDs:
 * 2 uppercase alphabetic characters from the event name + 4 digit number (e.g., "TF4821").
 */

/**
 * Extracts 2 uppercase alphabetic characters from an event name.
 * Examples:
 * - "Tech Fest" -> "TF"
 * - "Hackathon 2026" -> "HA"
 * - "AI Summit" -> "AS"
 * - "AIGNITE" -> "AI"
 * - "Dance & Music" -> "DM"
 * - "" / undefined -> "FE"
 */
export function getEventPrefix(eventTitle?: string | null): string {
  if (!eventTitle || typeof eventTitle !== 'string') return 'FE';

  // Extract clean alphabetical words
  const words = eventTitle
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 0);

  if (words.length >= 2) {
    // First letter of the first two lettered words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    if (words[0].length >= 2) {
      // First two letters of the single word
      return words[0].slice(0, 2).toUpperCase();
    } else {
      return (words[0] + 'E').toUpperCase();
    }
  }

  return 'FE';
}

/**
 * Generates a random 4-digit number string between 1000 and 9999
 */
export function generateRandom4Digits(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generates a new 6-character simple ticket ID:
 * 2 alphabets of the event name + 4 digit number (e.g., "TF4821")
 */
export function generateSimpleTicketId(eventTitle?: string | null): string {
  const prefix = getEventPrefix(eventTitle);
  const digits = generateRandom4Digits();
  return `${prefix}${digits}`;
}

/**
 * Checks if a given string is already in the 6-character format:
 * 2 uppercase letters followed by 4 digits (e.g. "TF4821")
 */
export function isSimpleTicketId(code?: string | null): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z]{2}[0-9]{4}$/.test(code.trim().toUpperCase());
}

/**
 * Deterministically derives a 6-character ticket ID from any legacy/long ticket ID.
 * Ensures the exact same ticket ID always produces the exact same 6-character code.
 */
export function getDeterministicTicketId(
  existingId?: string | null,
  eventTitle?: string | null
): string {
  if (!existingId || typeof existingId !== 'string') {
    return generateSimpleTicketId(eventTitle);
  }

  const clean = existingId.trim().toUpperCase();
  if (isSimpleTicketId(clean)) {
    return clean;
  }

  const prefix = getEventPrefix(eventTitle);

  // Compute a stable positive hash from the existingId
  let hash = 0;
  for (let i = 0; i < existingId.length; i++) {
    hash = (hash * 31 + existingId.charCodeAt(i)) % 9000;
  }
  const digits = (1000 + Math.abs(hash)).toString();

  return `${prefix}${digits}`;
}

/**
 * Formats any ticket object or ticket ID for user display.
 * Returns the 6-character ticket ID (e.g., "TF4821").
 */
export function getDisplayTicketId(
  ticketOrId: { ticketId?: string; id?: string; eventData?: { title?: string } } | string | null | undefined,
  fallbackEventTitle?: string | null
): string {
  if (!ticketOrId) return generateSimpleTicketId(fallbackEventTitle);

  if (typeof ticketOrId === 'string') {
    return getDeterministicTicketId(ticketOrId, fallbackEventTitle);
  }

  const rawId = ticketOrId.ticketId || ticketOrId.id;
  const eventTitle = ticketOrId.eventData?.title || fallbackEventTitle;

  return getDeterministicTicketId(rawId, eventTitle);
}
