/**
 * Event Email Helper Utility
 * Extracts and normalizes complete event details (date, time, venue, organizer)
 * across various Firestore event document structures.
 */

export interface ExtractedEventEmailDetails {
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  eventVenue: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  isTeamEvent: boolean;
  ticketPrice: number;
  currency: string;
}

/**
 * Format a Date object or ISO string into a human-readable date string.
 * Example: "Saturday, 25 October 2026"
 */
export function formatHumanDate(dateInput: unknown): string {
  if (!dateInput) return '';

  try {
    let d: Date;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // If pure YYYY-MM-DD, parse year, month, day to avoid UTC midnight timezone shift
      const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        d = new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
      } else {
        d = new Date(trimmed);
      }
    } else if (typeof dateInput === 'object' && dateInput !== null && 'toDate' in (dateInput as any)) {
      d = (dateInput as any).toDate();
    } else {
      return String(dateInput);
    }

    if (isNaN(d.getTime())) {
      return String(dateInput);
    }

    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format a time string or timestamp into a 12-hour AM/PM string.
 * Example: "10:00 AM"
 */
export function formatHumanTime(timeInput: unknown): string {
  if (!timeInput) return '';

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    // Check if already in 12-hour format like "10:00 AM" or "02:30 PM"
    if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    // Check 24-hour HH:mm format
    const hmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hmMatch) {
      let h = parseInt(hmMatch[1], 10);
      const m = hmMatch[2];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }

    // If ISO timestamp with T
    if (trimmed.includes('T')) {
      try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }).toUpperCase();
        }
      } catch {}
    }
  }

  return String(timeInput);
}

/**
 * Extract comprehensive, normalized email data from any event object.
 */
export function extractEventEmailDetails(eventData: any): ExtractedEventEmailDetails {
  if (!eventData || typeof eventData !== 'object') {
    return {
      eventTitle: 'Event Registration',
      eventDate: formatHumanDate(new Date()),
      eventVenue: 'Venue to be announced',
      organizerName: 'Festora',
      organizerEmail: 'festora@221blabs.com',
      isTeamEvent: false,
      ticketPrice: 0,
      currency: 'INR',
    };
  }

  // 1. Event Title
  const eventTitle = (eventData.title || eventData.name || eventData.eventTitle || 'Festora Event').trim();

  // 2. Dates & Times
  const rawStartDate =
    eventData.dateTime?.startDate ||
    eventData.startDate ||
    eventData.eventDate ||
    eventData.date ||
    eventData.preferredDate ||
    '';

  const rawEndDate =
    eventData.dateTime?.endDate ||
    eventData.endDate ||
    '';

  const formattedStartDate = formatHumanDate(rawStartDate) || 'Date to be announced';
  const formattedEndDate = rawEndDate ? formatHumanDate(rawEndDate) : undefined;

  // Extract Start Time
  let startTime =
    eventData.dateTime?.startTime ||
    eventData.eventTime ||
    eventData.startTime ||
    eventData.time ||
    '';

  if (!startTime && typeof rawStartDate === 'string' && rawStartDate.includes('T')) {
    startTime = formatHumanTime(rawStartDate);
  } else if (startTime) {
    startTime = formatHumanTime(startTime);
  }

  // Extract End Time
  let endTime =
    eventData.dateTime?.endTime ||
    eventData.endTime ||
    '';

  if (!endTime && typeof rawEndDate === 'string' && rawEndDate.includes('T')) {
    endTime = formatHumanTime(rawEndDate);
  } else if (endTime) {
    endTime = formatHumanTime(endTime);
  }

  let eventTime: string | undefined = undefined;
  if (startTime && endTime) {
    eventTime = `${startTime} - ${endTime}`;
  } else if (startTime) {
    eventTime = startTime;
  }

  // 3. Venue & Location
  let eventVenue = 'Venue to be announced';
  const isVirtual =
    eventData.venueType === 'virtual' ||
    eventData.venueType === 'online' ||
    eventData.isVirtual === true;

  if (isVirtual) {
    const link = eventData.virtualLink || eventData.meetingLink || eventData.virtualUrl;
    eventVenue = link ? `Virtual Online Event • Link: ${link}` : 'Virtual Online Event (Link will be shared before start)';
  } else {
    const parts: string[] = [];

    // Venue name
    if (typeof eventData.venue === 'string' && eventData.venue.trim()) {
      parts.push(eventData.venue.trim());
    } else if (typeof eventData.venue === 'object' && eventData.venue !== null) {
      if (eventData.venue.name) parts.push(eventData.venue.name.trim());
      if (eventData.venue.address) parts.push(eventData.venue.address.trim());
    }

    // Additional location parts
    const loc = eventData.location;
    if (typeof loc === 'string' && loc.trim()) {
      if (!parts.includes(loc.trim())) parts.push(loc.trim());
    } else if (typeof loc === 'object' && loc !== null) {
      if (loc.address && !parts.some(p => p.includes(loc.address))) parts.push(loc.address.trim());
      if (loc.city && !parts.some(p => p.includes(loc.city))) parts.push(loc.city.trim());
      if (loc.state && !parts.some(p => p.includes(loc.state))) parts.push(loc.state.trim());
    }

    if (parts.length > 0) {
      eventVenue = parts.join(', ');
    }
  }

  // 4. Organizer Details
  let organizerName = '';
  let organizerEmail = '';
  let organizerPhone = '';

  if (eventData.organizer && typeof eventData.organizer === 'object') {
    organizerName =
      eventData.organizer.name ||
      eventData.organizer.contactName ||
      eventData.organizer.organizationName ||
      '';
    organizerEmail = eventData.organizer.email || '';
    organizerPhone = eventData.organizer.phone || eventData.organizer.contactNumber || '';
  } else if (typeof eventData.organizer === 'string') {
    organizerName = eventData.organizer;
  }

  if (!organizerName) {
    organizerName = eventData.organizationName || eventData.organizerName || 'Festora Organizer';
  }
  if (!organizerEmail) {
    organizerEmail = eventData.organizerEmail || eventData.contactEmail || '';
  }
  if (!organizerPhone) {
    organizerPhone = eventData.organizerPhone || eventData.phoneNumber || '';
  }

  // 5. Team Settings & Pricing
  const isTeamEvent = Boolean(
    eventData.isTeamEvent ||
    (eventData.teamSettings && (eventData.teamSettings.minTeamSize || 0) > 1)
  );

  const ticketPrice = Number(eventData.ticketPrice ?? eventData.price ?? 0);
  const currency = eventData.currency || 'INR';

  return {
    eventTitle,
    eventDate: formattedStartDate,
    eventTime: eventTime || undefined,
    eventEndDate: formattedEndDate !== formattedStartDate ? formattedEndDate : undefined,
    eventVenue,
    organizerName,
    organizerEmail,
    organizerPhone: organizerPhone || undefined,
    isTeamEvent,
    ticketPrice,
    currency,
  };
}
