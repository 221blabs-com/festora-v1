/**
 * Centralized Festora Email Design System & Template Engine
 * 
 * Provides a unified, luxury Art-Deco & Modern Festora design for all transactional emails:
 * - Dark Obsidian Canvas (#080305 / #090909)
 * - Deep Charcoal Surface Cards (#121212 / #16060a)
 * - Crimson / Burgundy Accents (#8d1027, #b51030, #d31438)
 * - Warm Gold Accents (#ffd400, #facc15)
 * - Crisp High-Contrast Typography (#ffffff, #e2e8f0, #9ca3af)
 * - 100% Email Client Compatibility (Gmail, Outlook, Apple Mail, Yahoo)
 * - Dynamic Participant Registration Fields & QR Passes
 */

export interface DynamicEmailField {
  label: string;
  value: string;
}

export interface FestoraEmailButton {
  label: string;
  url: string;
  variant?: 'primary-crimson' | 'primary-gold' | 'secondary-outline';
}

export interface FestoraEmailLayoutOptions {
  title: string;
  preheader?: string;
  badgeText?: string;
  badgeType?: 'gold' | 'green' | 'crimson' | 'blue';
  heading: string;
  subheading?: string;
  contentHtml: string;
  primaryButton?: FestoraEmailButton;
  secondaryButton?: FestoraEmailButton;
  footerNote?: string;
}

/**
 * Normalizes any dynamic answers or field configurations into clean label-value pairs.
 * Completely dynamic: does NOT hardcode field names.
 */
export function extractDynamicEmailFields(data: {
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  college?: string;
  department?: string;
  rollNumber?: string;
  year?: string;
  gender?: string;
  tshirtSize?: string;
  foodPreference?: string;
  customAnswers?: Record<string, any>;
  registrationAnswers?: Array<{ label?: string; answer?: any; show_on_ticket?: boolean; showOnTicket?: boolean }>;
}): DynamicEmailField[] {
  const fields: DynamicEmailField[] = [];
  const seenLabels = new Set<string>();

  // 1. Process explicit registrationAnswers array if provided
  if (Array.isArray(data.registrationAnswers) && data.registrationAnswers.length > 0) {
    for (const item of data.registrationAnswers) {
      if (!item || !item.label) continue;
      const labelTrimmed = item.label.trim();
      const lower = labelTrimmed.toLowerCase();
      if (seenLabels.has(lower)) continue;

      let valStr = '';
      if (typeof item.answer === 'boolean') {
        valStr = item.answer ? 'Yes' : 'No';
      } else if (Array.isArray(item.answer)) {
        valStr = item.answer.filter(Boolean).join(', ');
      } else if (item.answer !== undefined && item.answer !== null) {
        valStr = String(item.answer).trim();
      }

      if (valStr) {
        fields.push({ label: labelTrimmed, value: valStr });
        seenLabels.add(lower);
      }
    }
  }

  // 2. Process customAnswers dictionary
  if (data.customAnswers && typeof data.customAnswers === 'object') {
    for (const [rawKey, rawVal] of Object.entries(data.customAnswers)) {
      if (!rawVal) continue;
      // Filter out internal system keys
      if (['registrationanswers', 'fieldconfigs', 'pricingsnapshot', 'pricingbreakdown'].includes(rawKey.toLowerCase())) continue;

      const formattedLabel = rawKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim();
      const capitalizedLabel = formattedLabel.charAt(0).toUpperCase() + formattedLabel.slice(1);
      const lower = capitalizedLabel.toLowerCase();
      if (seenLabels.has(lower)) continue;

      let valStr = '';
      if (typeof rawVal === 'boolean') {
        valStr = rawVal ? 'Yes' : 'No';
      } else if (Array.isArray(rawVal)) {
        valStr = rawVal.filter(Boolean).join(', ');
      } else {
        valStr = String(rawVal).trim();
      }

      if (valStr) {
        fields.push({ label: capitalizedLabel, value: valStr });
        seenLabels.add(lower);
      }
    }
  }

  // 3. Ensure core fields are represented if passed as top-level params and not yet captured
  const addIfMissing = (label: string, val?: string) => {
    if (!val || !val.trim()) return;
    const lower = label.toLowerCase();
    if (!seenLabels.has(lower)) {
      fields.push({ label, value: val.trim() });
      seenLabels.add(lower);
    }
  };

  if (data.participantName) {
    // If name not in fields, insert at beginning
    const hasName = Array.from(seenLabels).some(l => l.includes('name'));
    if (!hasName) {
      fields.unshift({ label: 'Full Name', value: data.participantName.trim() });
      seenLabels.add('full name');
    }
  }

  addIfMissing('Email Address', data.participantEmail);
  addIfMissing('Phone Number', data.participantPhone);
  addIfMissing('College / University', data.college);
  addIfMissing('Department / Branch', data.department);
  addIfMissing('Roll Number / Reg ID', data.rollNumber);
  addIfMissing('Year of Study', data.year);
  addIfMissing('Gender', data.gender);
  addIfMissing('T-Shirt Size', data.tshirtSize);
  addIfMissing('Food Preference', data.foodPreference);

  return fields;
}

/**
 * Master Festora Email Layout Wrapper
 * Renders table-based email container matching the exact Festora dark & gold/crimson aesthetic.
 */
export function buildFestoraEmailLayout(options: FestoraEmailLayoutOptions): string {
  const {
    title,
    preheader = 'Official notification from Festora',
    badgeText,
    badgeType = 'gold',
    heading,
    subheading,
    contentHtml,
    primaryButton,
    secondaryButton,
    footerNote
  } = options;

  const currentYear = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';

  // Badge styles
  let badgeBg = 'rgba(250, 204, 21, 0.12)';
  let badgeBorder = '#facc15';
  let badgeColor = '#facc15';
  if (badgeType === 'green') {
    badgeBg = 'rgba(16, 185, 129, 0.15)';
    badgeBorder = '#10b981';
    badgeColor = '#10b981';
  } else if (badgeType === 'crimson') {
    badgeBg = 'rgba(220, 38, 38, 0.15)';
    badgeBorder = '#ef4444';
    badgeColor = '#f87171';
  } else if (badgeType === 'blue') {
    badgeBg = 'rgba(56, 189, 248, 0.15)';
    badgeBorder = '#38bdf8';
    badgeColor = '#38bdf8';
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #080305 !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .btn-mobile { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #080305; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f3f4f6;">
  
  <!-- Preheader preview text (invisible in email body) -->
  <div style="display: none; font-size: 1px; color: #080305; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #080305; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 30px 12px 40px;">
        
        <!-- Main Card Container (Max 600px) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" role="presentation" style="max-width: 600px; background-color: #121212; border: 1px solid #3f1119; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);">
          
          <!-- Top Multi-Stop Crimson & Gold Shimmer Ribbon -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #8d1027 0%, #dc2626 30%, #facc15 50%, #dc2626 70%, #8d1027 100%); line-height: 4px; font-size: 1px;">
              &nbsp;
            </td>
          </tr>

          <!-- 1. FESTORA HEADER -->
          <tr>
            <td align="center" style="background: radial-gradient(ellipse at top, #1c050a 0%, #121212 100%); padding: 32px 24px 22px; border-bottom: 1px solid #22080e;">
              
              <!-- Emblem & Brand Name -->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <span style="font-size: 20px; color: #facc15; vertical-align: middle; line-height: 1;">✦</span>
                    <span style="font-family: 'Marcellus', 'Cinzel', 'Times New Roman', Georgia, serif; font-size: 26px; font-weight: 800; letter-spacing: 5px; color: #ffffff; text-transform: uppercase; margin-left: 8px; vertical-align: middle; line-height: 1;">F E S T O R A</span>
                    <span style="font-size: 20px; color: #facc15; vertical-align: middle; line-height: 1; margin-left: 8px;">✦</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #facc15; text-transform: uppercase;">
                      EVENTS • TICKETS • EXPERIENCES
                    </span>
                  </td>
                </tr>
              </table>

              ${badgeText ? `
              <!-- Status Badge -->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 18px;">
                <tr>
                  <td align="center" style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 20px; padding: 6px 18px;">
                    <span style="font-size: 11.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${badgeColor};">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- 2. MAIN CONTENT BODY -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 30px 24px;">
              
              <!-- Heading -->
              <h1 style="margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 1.35;">
                ${heading}
              </h1>

              ${subheading ? `
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                ${subheading}
              </p>
              ` : `<div style="height: 16px;"></div>`}

              <!-- Injected Section Cards (Event, Participant, Payment, QR, etc.) -->
              ${contentHtml}

              <!-- Primary / Secondary Action Buttons -->
              ${(primaryButton || secondaryButton) ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 30px 0 16px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        ${primaryButton ? `
                        <td align="center" style="padding: 6px 8px;">
                          <a href="${primaryButton.url}" target="_blank" class="btn-mobile" style="display: inline-block; background: linear-gradient(90deg, #8d1027 0%, #b51030 100%); background-color: #8d1027; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 14px 34px; border-radius: 11px; border: 1px solid #d31438; box-shadow: 0 4px 18px rgba(211, 20, 56, 0.35); text-align: center;">
                            ${primaryButton.label} &rarr;
                          </a>
                        </td>
                        ` : ''}
                        ${secondaryButton ? `
                        <td align="center" style="padding: 6px 8px;">
                          <a href="${secondaryButton.url}" target="_blank" class="btn-mobile" style="display: inline-block; background-color: #1a1a1a; color: #facc15 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 11px; border: 1px solid #3f1119; text-align: center;">
                            ${secondaryButton.label}
                          </a>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${footerNote ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top: 24px; border-top: 1px solid #1c050a; padding-top: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
                      ${footerNote}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- 14. CONSISTENT FESTORA FOOTER -->
          <tr>
            <td align="center" style="background-color: #0a0a0a; border-top: 1px solid #3f1119; padding: 24px 24px 26px;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #9ca3af;">
                Need assistance? Contact Festora Support at
                <a href="mailto:festora@221blabs.com" style="color: #facc15; text-decoration: none; font-weight: 600;">festora@221blabs.com</a>
              </p>
              <p style="margin: 0 0 10px; font-size: 11.5px; color: #64748b; letter-spacing: 0.5px;">
                Festora &bull; 221B Labs &bull; <a href="${baseUrl}" style="color: #9ca3af; text-decoration: none;">festora.221blabs.com</a>
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #475569;">
                Automated Transactional Notification &bull; &copy; ${currentYear} Festora. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * 3. EVENT INFORMATION CARD
 * Displays Event Name, Date, Time, Venue, Ticket Type, Quantity, Registration ID, Order ID.
 */
export function renderEventInfoCard(data: {
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventVenue: string;
  ticketType?: string;
  quantity?: number;
  registrationId?: string;
  orderId?: string;
}): string {
  const {
    eventTitle,
    eventDate,
    eventTime,
    eventVenue,
    ticketType = 'General Admission',
    quantity = 1,
    registrationId,
    orderId
  } = data;

  const scheduleStr = eventTime ? `${eventDate} • ${eventTime}` : eventDate;

  return `
  <!-- EVENT INFORMATION CARD -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
    <tr>
      <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          <tr>
            <td>
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
                📅 EVENT INFORMATION
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; width: 130px; text-transform: uppercase; letter-spacing: 0.5px;">Event:</td>
            <td style="padding: 5px 0; font-size: 15px; color: #ffffff; font-weight: 700;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Date &amp; Time:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6; font-weight: 600;">${scheduleStr}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Venue:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${eventVenue || 'Venue announced soon'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Type:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #facc15; font-weight: 700;">${ticketType}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Tickets:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #ffffff; font-weight: 600;">${quantity} ${quantity === 1 ? 'Pass' : 'Passes'}</td>
          </tr>
          ${orderId ? `
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Order ID:</td>
            <td style="padding: 5px 0; font-size: 12.5px; color: #facc15; font-family: monospace; font-weight: 700;">#${orderId}</td>
          </tr>
          ` : ''}
          ${registrationId && registrationId !== orderId ? `
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Reg ID:</td>
            <td style="padding: 5px 0; font-size: 12.5px; color: #93c5fd; font-family: monospace; font-weight: 700;">${registrationId}</td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
  `;
}

/**
 * 4. PARTICIPANT DETAILS CARD (DYNAMIC!)
 * Dynamically displays all submitted registration answers. Zero hard-coding!
 */
export function renderParticipantDetailsCard(fields: DynamicEmailField[]): string {
  if (!fields || fields.length === 0) return '';

  const rowsHtml = fields.map((f) => `
    <tr>
      <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; width: 140px; text-transform: uppercase; letter-spacing: 0.5px;">
        ${f.label}:
      </td>
      <td style="padding: 6px 0; font-size: 13.5px; color: #ffffff; font-weight: 600;">
        ${f.value}
      </td>
    </tr>
  `).join('');

  return `
  <!-- PARTICIPANT DETAILS CARD (DYNAMIC) -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border: 1px solid #3f1119; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
    <tr>
      <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(220, 38, 38, 0.25);">
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
          👤 PARTICIPANT REGISTRATION DETAILS
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          ${rowsHtml}
        </table>
      </td>
    </tr>
  </table>
  `;
}

/**
 * 5. PAYMENT INFORMATION CARD
 * Ticket Price, Quantity, Festora Platform Fee, Total Amount, Payment Status.
 */
export function renderPaymentCard(data: {
  ticketPrice: number;
  quantity?: number;
  platformFee?: number;
  totalAmount?: number;
  currency?: string;
  paymentStatus?: string;
}): string {
  const {
    ticketPrice,
    quantity = 1,
    platformFee,
    totalAmount,
    currency = 'INR',
    paymentStatus = 'Completed'
  } = data;

  const isFree = ticketPrice === 0 && (!totalAmount || totalAmount === 0);
  const resolvedPlatformFee = platformFee !== undefined
    ? platformFee
    : (isFree ? 0 : 5 + quantity);
  const resolvedTotal = totalAmount !== undefined
    ? totalAmount
    : (isFree ? 0 : ticketPrice * quantity + resolvedPlatformFee);

  const formatRupee = (val: number) => {
    return currency === 'INR' || currency === '₹' ? `₹${val.toLocaleString('en-IN')}` : `${currency} ${val.toLocaleString()}`;
  };

  return `
  <!-- PAYMENT INFORMATION CARD -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
    <tr>
      <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
          💳 PAYMENT DETAILS
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; width: 140px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Price:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #ffffff;">
              ${isFree ? '₹0 (Free Admission)' : `${formatRupee(ticketPrice)} ${quantity > 1 ? `&times; ${quantity}` : ''}`}
            </td>
          </tr>
          ${!isFree ? `
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Festora Fee:</td>
            <td style="padding: 5px 0; font-size: 13.5px; color: #ffffff;">${formatRupee(resolvedPlatformFee)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #facc15; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount:</td>
            <td style="padding: 8px 0; font-size: 16px; color: #facc15; font-weight: 800;">
              ${isFree ? 'FREE' : formatRupee(resolvedTotal)}
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Status:</td>
            <td style="padding: 5px 0;">
              <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                ${paymentStatus || 'Confirmed'}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

/**
 * 6. TICKET / QR CODE SECTION
 * Highlighted VIP pass section with clean QR code container, ticket pass code, and view button.
 */
export function renderTicketQrCard(data: {
  ticketCode: string;
  viewTicketUrl?: string;
  customCid?: string;
}): string {
  const { ticketCode, viewTicketUrl, customCid } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const resolvedUrl = viewTicketUrl || `${baseUrl}/dashboard/tickets`;
  const qrCdnUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(ticketCode)}&margin=1`;
  const qrSrc = customCid ? `cid:${customCid}` : qrCdnUrl;

  return `
  <!-- TICKET / QR CODE PASS SECTION -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background: linear-gradient(180deg, #180408 0%, #100204 100%); border: 2px solid #facc15; border-radius: 12px; margin: 24px 0; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);">
    <tr>
      <td align="center" style="padding: 24px 20px 8px;">
        <span style="font-size: 12.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
          ✦ ENTRY PASS &amp; VERIFICATION QR CODE ✦
        </span>
        <p style="margin: 6px 0 18px; font-size: 12px; color: #9ca3af;">
          Present this unique QR code at the event entrance for verification and entry check-in.
        </p>

        <!-- White QR Container with Gold Rim -->
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border: 3px solid #facc15; border-radius: 10px; padding: 12px; margin: 0 auto; box-shadow: 0 4px 18px rgba(250, 204, 21, 0.3);">
          <tr>
            <td align="center">
              <img src="${qrSrc}" alt="Entry QR Code for ${ticketCode}" width="180" height="180" style="display: block; margin: 0 auto; border: 0;" />
            </td>
          </tr>
        </table>

        <!-- Ticket Identifier Pill -->
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 18px;">
          <tr>
            <td align="center">
              <span style="font-size: 10.5px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af;">
                UNIQUE TICKET PASS CODE
              </span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 6px;">
              <div style="background-color: #080305; border: 1.5px solid #facc15; border-radius: 6px; padding: 8px 24px; font-family: 'Courier New', Consolas, monospace; font-size: 16px; font-weight: 800; color: #facc15; letter-spacing: 3px; display: inline-block;">
                ${ticketCode}
              </div>
            </td>
          </tr>
        </table>

        <!-- View & Download Ticket Button -->
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px auto 16px;">
          <tr>
            <td align="center">
              <a href="${resolvedUrl}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #8d1027 0%, #b51030 100%); background-color: #8d1027; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 13px 32px; border-radius: 10px; border: 1px solid #d31438; box-shadow: 0 4px 16px rgba(211, 20, 56, 0.4); text-align: center;">
                VIEW &amp; DOWNLOAD TICKET &rarr;
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
  `;
}

/**
 * 12. TEAM REGISTRATION DETAILS CARD
 * Displays Team Name, Team Size, and each member's breakdown.
 */
export function renderTeamMembersCard(data: {
  teamName: string;
  teamSize: number;
  orderNumber: string;
  members: Array<{
    name: string;
    email: string;
    ticketCode?: string;
    phone?: string;
    college?: string;
    tshirtSize?: string;
    foodPreference?: string;
  }>;
}): string {
  const { teamName, teamSize, orderNumber, members } = data;

  const memberCardsHtml = members.map((m, idx) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #0d0406; border: 1px solid #3f1119; border-radius: 8px; margin-bottom: 12px; padding: 12px 16px;">
      <tr>
        <td style="font-size: 11px; font-weight: 700; color: #facc15; text-transform: uppercase; letter-spacing: 1px;">
          Member #${idx + 1}
        </td>
        ${m.ticketCode ? `
        <td align="right" style="font-family: monospace; font-size: 12px; color: #facc15; font-weight: 700;">
          Pass: ${m.ticketCode}
        </td>
        ` : ''}
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 6px; font-size: 14px; font-weight: 700; color: #ffffff;">
          ${m.name}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="font-size: 12px; color: #9ca3af; padding-top: 2px;">
          ${m.email}${m.phone ? ` &bull; ${m.phone}` : ''}
        </td>
      </tr>
      ${(m.college || m.tshirtSize || m.foodPreference) ? `
      <tr>
        <td colspan="2" style="font-size: 11.5px; color: #fca5a5; padding-top: 4px;">
          ${[m.college, m.tshirtSize ? `Size: ${m.tshirtSize}` : '', m.foodPreference ? `Food: ${m.foodPreference}` : ''].filter(Boolean).join(' &bull; ')}
        </td>
      </tr>
      ` : ''}
    </table>
  `).join('');

  return `
  <!-- TEAM REGISTRATION CARD -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border: 1px solid #3f1119; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
    <tr>
      <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          <tr>
            <td>
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
                👥 TEAM DETAILS &bull; ${teamName.toUpperCase()}
              </span>
            </td>
            <td align="right">
              <span style="font-size: 11px; color: #9ca3af;">
                Size: <strong style="color: #ffffff;">${teamSize}</strong>
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 20px 6px;">
        ${memberCardsHtml}
      </td>
    </tr>
  </table>
  `;
}

/**
 * ORGANIZER DETAILS CARD
 */
export function renderOrganizerCard(data: {
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizationName?: string;
  username?: string;
}): string {
  const { organizerName, organizerEmail, organizerPhone, organizationName, username } = data;
  if (!organizerName && !organizerEmail && !organizationName) return '';

  return `
  <!-- ORGANIZER DETAILS CARD -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border: 1px solid #3f1119; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
    <tr>
      <td style="padding: 14px 20px 8px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
          🏢 ORGANIZER INFORMATION
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 14px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
          ${organizationName ? `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; width: 130px; text-transform: uppercase;">Organization:</td>
            <td style="padding: 4px 0; font-size: 13.5px; color: #ffffff; font-weight: 700;">${organizationName}</td>
          </tr>
          ` : ''}
          ${organizerName ? `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; width: 130px; text-transform: uppercase;">Organizer:</td>
            <td style="padding: 4px 0; font-size: 13.5px; color: #ffffff; font-weight: 600;">${organizerName}</td>
          </tr>
          ` : ''}
          ${organizerEmail ? `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Email:</td>
            <td style="padding: 4px 0; font-size: 13px; color: #facc15;">
              <a href="mailto:${organizerEmail}" style="color: #facc15; text-decoration: none;">${organizerEmail}</a>
            </td>
          </tr>
          ` : ''}
          ${organizerPhone ? `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Contact:</td>
            <td style="padding: 4px 0; font-size: 13px; color: #f3f4f6;">${organizerPhone}</td>
          </tr>
          ` : ''}
          ${username ? `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Handle:</td>
            <td style="padding: 4px 0; font-size: 13px; color: #93c5fd; font-family: monospace;">@${username}</td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
  `;
}

/**
 * SLEEK NOTICE / INSTRUCTIONS CALLOUT BOX
 */
export function renderNoticeBox(options: {
  title: string;
  items: string[];
  type?: 'warning' | 'info' | 'success';
}): string {
  const { title, items, type = 'warning' } = options;
  let borderColor = '#facc15';
  let titleColor = '#facc15';
  if (type === 'info') {
    borderColor = '#38bdf8';
    titleColor = '#38bdf8';
  } else if (type === 'success') {
    borderColor = '#10b981';
    titleColor = '#10b981';
  }

  const listHtml = items.map(it => `
    <li style="margin-bottom: 6px; font-size: 12.5px; line-height: 1.6; color: #cbd5e1;">${it}</li>
  `).join('');

  return `
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border-left: 4px solid ${borderColor}; border-radius: 6px; margin: 20px 0; overflow: hidden;">
    <tr>
      <td style="padding: 16px 20px;">
        <span style="font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${titleColor};">
          ${title}
        </span>
        <ul style="margin: 10px 0 0; padding-left: 18px;">
          ${listHtml}
        </ul>
      </td>
    </tr>
  </table>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-LEVEL TRANSACTIONAL EMAIL BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 11. PARTICIPANT CONFIRMATION & TICKET PASS EMAIL
 */
export interface ParticipantTicketEmailData {
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  currency?: string;
  eventDate: string;
  eventTime?: string;
  eventEndDate?: string;
  eventVenue: string;
  ticketCode: string;
  quantity?: number;
  platformFee?: number;
  totalAmount?: number;
  paymentStatus?: string;
  ticketType?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizationName?: string;
  viewTicketUrl?: string;
  customCid?: string;
  participantDetails?: Record<string, any>;
  customAnswers?: Record<string, any>;
  registrationAnswers?: Array<{ label?: string; answer?: any; show_on_ticket?: boolean; showOnTicket?: boolean }>;
}

export function buildParticipantTicketEmailHtml(data: ParticipantTicketEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const cleanEvent = (data.eventTitle || '').replace(/[<>"']/g, '').trim();
  const ticketUrl = data.viewTicketUrl || `${baseUrl}/dashboard/tickets`;

  // Merge participant details into unified dynamic answers
  const dynamicAnswers: Record<string, any> = {
    ...(data.participantDetails?.customAnswers || {}),
    ...(data.customAnswers || {}),
  };

  const dynamicFields = extractDynamicEmailFields({
    participantName: data.customerName,
    participantEmail: data.customerEmail,
    participantPhone: data.participantDetails?.phone,
    college: data.participantDetails?.college,
    department: data.participantDetails?.department,
    rollNumber: data.participantDetails?.rollNumber,
    year: data.participantDetails?.year,
    gender: data.participantDetails?.gender,
    tshirtSize: data.participantDetails?.tshirtSize,
    foodPreference: data.participantDetails?.foodPreference,
    customAnswers: dynamicAnswers,
    registrationAnswers: data.registrationAnswers,
  });

  const cardsHtml = `
    ${renderEventInfoCard({
      eventTitle: cleanEvent,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventVenue: data.eventVenue,
      ticketType: data.ticketType || 'General Admission',
      quantity: data.quantity || 1,
      orderId: data.orderNumber,
      registrationId: data.ticketCode,
    })}

    ${renderOrganizerCard({
      organizerName: data.organizerName,
      organizerEmail: data.organizerEmail,
      organizerPhone: data.organizerPhone,
      organizationName: data.organizationName,
    })}

    ${renderParticipantDetailsCard(dynamicFields)}

    ${renderPaymentCard({
      ticketPrice: data.ticketPrice,
      quantity: data.quantity || 1,
      platformFee: data.platformFee,
      totalAmount: data.totalAmount,
      currency: data.currency || 'INR',
      paymentStatus: data.paymentStatus || 'Completed',
    })}

    ${renderTicketQrCard({
      ticketCode: data.ticketCode,
      viewTicketUrl: ticketUrl,
      customCid: data.customCid,
    })}

    ${renderNoticeBox({
      title: '⚠️ VENUE ENTRY GUIDELINES',
      type: 'warning',
      items: [
        'Please arrive at least 15 minutes before scheduled start time.',
        'Keep this email or your downloaded ticket pass open on your smartphone.',
        'Present the QR code at the entrance verification checkpoint for fast scanning.',
        'Each ticket QR code is cryptographically unique and strictly valid for single check-in.',
      ],
    })}
  `;

  return buildFestoraEmailLayout({
    title: `Entry Ticket: "${cleanEvent}" - Festora`,
    preheader: `Your entry pass #${data.ticketCode} for ${cleanEvent} is confirmed.`,
    badgeText: '✓ REGISTRATION CONFIRMED & VALID',
    badgeType: 'green',
    heading: 'Registration Confirmed & Valid',
    subheading: `Hello <strong>${data.customerName}</strong>, your registration for <strong>"${cleanEvent}"</strong> is confirmed. Keep your digital pass ready at the venue entrance.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'VIEW & DOWNLOAD TICKET',
      url: ticketUrl,
    },
    footerNote: 'This is an official transactional entry pass issued by Festora on behalf of the event organizers.',
  });
}

/**
 * 12. TEAM REGISTRATION CONFIRMATION EMAIL
 */
export interface TeamRegistrationEmailData {
  teamName: string;
  teamSize: number;
  customerName?: string;
  customerEmail?: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  currency?: string;
  eventDate: string;
  eventTime?: string;
  eventEndDate?: string;
  eventVenue: string;
  leadTicketCode: string;
  platformFee?: number;
  totalAmount?: number;
  paymentStatus?: string;
  ticketType?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizationName?: string;
  viewTicketUrl?: string;
  members: Array<{
    name: string;
    email: string;
    ticketCode?: string;
    phone?: string;
    college?: string;
    department?: string;
    tshirtSize?: string;
    foodPreference?: string;
    customAnswers?: Record<string, any>;
  }>;
}

export function buildTeamRegistrationEmailHtml(data: TeamRegistrationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const cleanEvent = (data.eventTitle || '').replace(/[<>"']/g, '').trim();
  const ticketUrl = data.viewTicketUrl || `${baseUrl}/dashboard/tickets`;

  const cardsHtml = `
    ${renderEventInfoCard({
      eventTitle: cleanEvent,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventVenue: data.eventVenue,
      ticketType: data.ticketType || 'Team Pass',
      quantity: data.teamSize,
      orderId: data.orderNumber,
      registrationId: data.leadTicketCode,
    })}

    ${renderTeamMembersCard({
      teamName: data.teamName,
      teamSize: data.teamSize,
      orderNumber: data.orderNumber,
      members: data.members,
    })}

    ${renderOrganizerCard({
      organizerName: data.organizerName,
      organizerEmail: data.organizerEmail,
      organizerPhone: data.organizerPhone,
      organizationName: data.organizationName,
    })}

    ${renderPaymentCard({
      ticketPrice: data.ticketPrice,
      quantity: data.teamSize,
      platformFee: data.platformFee,
      totalAmount: data.totalAmount,
      currency: data.currency || 'INR',
      paymentStatus: data.paymentStatus || 'Completed',
    })}

    ${renderTicketQrCard({
      ticketCode: data.leadTicketCode,
      viewTicketUrl: ticketUrl,
    })}

    ${renderNoticeBox({
      title: '👥 TEAM ENTRY INSTRUCTIONS',
      type: 'info',
      items: [
        `All ${data.teamSize} team members have been registered under Team "${data.teamName}".`,
        'Individual confirmation tickets with unique pass codes have been dispatched to each team member email.',
        'The team captain may present the primary QR code or each member may check in individually.',
        'Please have photo identity ready matching the registered attendee names.',
      ],
    })}
  `;

  return buildFestoraEmailLayout({
    title: `Team Registration Confirmed: "${cleanEvent}" - Festora`,
    preheader: `Team ${data.teamName} is registered for ${cleanEvent}. Order #${data.orderNumber}`,
    badgeText: '✓ TEAM REGISTRATION CONFIRMED',
    badgeType: 'green',
    heading: 'Team Pass & Registration Confirmed',
    subheading: `Congratulations! Team <strong>"${data.teamName}"</strong> has been successfully registered for <strong>"${cleanEvent}"</strong>.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'VIEW & DOWNLOAD TICKETS',
      url: ticketUrl,
    },
    footerNote: 'All team member passes are linked to Order ID #' + data.orderNumber,
  });
}

/**
 * 9. ORGANIZER SUBMISSION TO ADMIN EMAIL
 */
export interface AdminNewEventEmailData {
  adminEmail?: string;
  organizer: {
    organizationName?: string;
    contactName?: string;
    email: string;
    phone?: string;
    username?: string;
    eventTypes?: string;
  };
  event: {
    id?: string;
    title: string;
    startDate?: string;
    endDate?: string;
    eventTime?: string;
    venue?: string;
    venueType?: string;
    price?: number;
    currency?: string;
    capacity?: number;
    category?: string;
    description?: string;
  };
  requestId?: string;
  adminReviewUrl?: string;
}

export function buildAdminNewEventNotificationHtml(params: AdminNewEventEmailData): string {
  const { organizer, event, requestId, adminReviewUrl } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const reviewUrl = adminReviewUrl || `${baseUrl}/admin`;

  const scheduleStr = event.startDate
    ? (event.endDate && event.endDate !== event.startDate ? `${event.startDate} - ${event.endDate}` : event.startDate)
    : 'Date pending';

  const cardsHtml = `
    <!-- ORGANIZER DETAILS CARD -->
    ${renderOrganizerCard({
      organizerName: organizer.contactName,
      organizerEmail: organizer.email,
      organizerPhone: organizer.phone,
      organizationName: organizer.organizationName,
      username: organizer.username,
    })}

    <!-- EVENT DETAILS CARD -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
            📋 SUBMITTED EVENT DETAILS
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; width: 140px; text-transform: uppercase;">Event Title:</td>
              <td style="padding: 5px 0; font-size: 15px; color: #ffffff; font-weight: 700;">${event.title}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Schedule:</td>
              <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${scheduleStr}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Venue:</td>
              <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${event.venue || 'TBA'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Category:</td>
              <td style="padding: 5px 0; font-size: 13.5px; color: #facc15;">${event.category || 'Event'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Pricing:</td>
              <td style="padding: 5px 0; font-size: 14px; color: #ffffff; font-weight: 700;">
                ${(event.price && event.price > 0) ? `${event.currency || 'INR'} ${event.price}` : 'Free Admission'}
              </td>
            </tr>
            ${event.capacity ? `
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Expected Scale:</td>
              <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${event.capacity} Attendees</td>
            </tr>
            ` : ''}
            ${requestId ? `
            <tr>
              <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Request ID:</td>
              <td style="padding: 5px 0; font-size: 12.5px; color: #93c5fd; font-family: monospace;">#${requestId}</td>
            </tr>
            ` : ''}
          </table>

          ${event.description ? `
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #22080e;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Description:</span>
            <p style="margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap;">${event.description}</p>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>

    ${renderNoticeBox({
      title: '⚡ ACTION REQUIRED BY ADMINISTRATOR',
      type: 'warning',
      items: [
        'A new organizer has registered and submitted an event for approval before publication.',
        'Review the submitted details, organizer credentials, and venue verification.',
        'Click the button below to Approve or Reject this request directly from the Admin Panel.',
      ],
    })}
  `;

  return buildFestoraEmailLayout({
    title: `New Event Submission: "${event.title}" - Festora Admin`,
    preheader: `New event submission "${event.title}" submitted by ${organizer.organizationName || organizer.contactName}. Review required.`,
    badgeText: '✦ NEW EVENT SUBMISSION ✦',
    badgeType: 'gold',
    heading: 'New Event Submission',
    subheading: `A new event has been submitted by <strong>${organizer.organizationName || organizer.contactName}</strong> and requires administrator review.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'REVIEW EVENT',
      url: reviewUrl,
    },
    footerNote: 'Festora Administration Security System • Confidential Internal Notification',
  });
}

/**
 * 10. ORGANIZER STATUS & CREDENTIALS EMAIL (Approval, Rejection, Submission)
 */
export interface OrganizerCredentialsEmailData {
  organizerName: string;
  username: string;
  password?: string;
  eventTitle: string;
  eventId?: string;
  status?: 'created' | 'approved' | 'submitted' | 'rejected';
  rejectionReason?: string;
  eventDate?: string;
  eventVenue?: string;
}

export function buildOrganizerCredentialsHtml(data: OrganizerCredentialsEmailData): string {
  const {
    organizerName,
    username,
    password,
    eventTitle,
    eventId,
    status = 'approved',
    rejectionReason,
    eventDate,
    eventVenue,
  } = data;

  const isApproved = status === 'approved';
  const isCreated = status === 'created';
  const isRejected = status === 'rejected';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const organizerLoginUrl = `${baseUrl}/organizer`;
  const eventUrl = eventId ? `${baseUrl}/events/${eventId}` : `${baseUrl}/events`;

  let badgeText = '✦ APPLICATION RECEIVED ✦';
  let badgeType: 'gold' | 'green' | 'crimson' = 'gold';
  let heading = 'Event Application Received';
  let subheading = `Hello <strong>${organizerName || 'Organizer'}</strong>, we have received your event submission for <strong>"${eventTitle}"</strong>.`;
  let primaryBtn: FestoraEmailButton = { label: 'VIEW EVENT', url: eventUrl };
  let secondaryBtn: FestoraEmailButton | undefined = { label: 'ORGANIZER DASHBOARD', url: organizerLoginUrl };

  let cardsHtml = '';

  if (isApproved || isCreated) {
    badgeText = '✓ EVENT APPROVED';
    badgeType = 'green';
    heading = 'Event Approved!';
    subheading = `Congratulations <strong>${organizerName || 'Organizer'}</strong>! Your event <strong>"${eventTitle}"</strong> has been approved and is now published.`;

    cardsHtml = `
      <!-- EVENT STATUS CARD -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
        <tr>
          <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(16, 185, 129, 0.2);">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #10b981;">
              ● EVENT IS LIVE &amp; PUBLISHED
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0 0 6px; font-size: 17px; font-weight: 800; color: #ffffff;">${eventTitle}</p>
            ${eventDate ? `<p style="margin: 0 0 4px; font-size: 13px; color: #f3f4f6;">Date: <strong>${eventDate}</strong></p>` : ''}
            ${eventVenue ? `<p style="margin: 0 0 4px; font-size: 13px; color: #9ca3af;">Venue: ${eventVenue}</p>` : ''}
            ${eventId ? `<p style="margin: 8px 0 0; font-size: 11.5px; color: #93c5fd; font-family: monospace;">Event ID: #${eventId}</p>` : ''}
          </td>
        </tr>
      </table>

      <!-- LOGIN CREDENTIALS CARD -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border: 2px solid #facc15; border-radius: 10px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(250, 204, 21, 0.15);">
        <tr>
          <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.25); background-color: #1a1608;">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
              🔑 ORGANIZER DASHBOARD LOGIN CREDENTIALS
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 18px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; width: 130px; text-transform: uppercase;">Login URL:</td>
                <td style="padding: 6px 0; font-size: 13px;">
                  <a href="${organizerLoginUrl}" style="color: #facc15; text-decoration: none; font-weight: 600;">${organizerLoginUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Username:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #ffffff; font-family: monospace; font-weight: 700;">${username}</td>
              </tr>
              ${password ? `
              <tr>
                <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Password:</td>
                <td style="padding: 6px 0; font-size: 15px; color: #facc15; font-family: monospace; font-weight: 800;">${password}</td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>

      ${renderNoticeBox({
        title: '🚀 WHAT YOU CAN DO FROM YOUR DASHBOARD',
        type: 'info',
        items: [
          'Track live ticket registrations and attendee numbers in real time.',
          'Configure custom attendee questions and dynamic registration fields.',
          'Download attendee lists and filter participant responses.',
          'Use the Festora QR Scanner tool at the venue gate for instant check-in.',
        ],
      })}
    `;
    primaryBtn = { label: 'VIEW EVENT', url: eventUrl };
    secondaryBtn = { label: 'ORGANIZER DASHBOARD', url: organizerLoginUrl };
  } else if (isRejected) {
    badgeText = 'EVENT REVIEW UPDATE';
    badgeType = 'crimson';
    heading = 'Event Review Update';
    subheading = `Regarding your event submission for <strong>"${eventTitle}"</strong>.`;

    cardsHtml = `
      ${renderNoticeBox({
        title: 'REVIEW DECISION & FEEDBACK',
        type: 'warning',
        items: [
          `Your event submission for "${eventTitle}" could not be approved for publication at this time.`,
          rejectionReason ? `Admin Feedback: ${rejectionReason}` : 'The event submission did not meet publication guidelines or required further information.',
          'You may address the feedback and submit a new request or reply to this email for assistance.',
        ],
      })}
    `;
    primaryBtn = { label: 'CONTACT FESTORA SUPPORT', url: 'mailto:festora@221blabs.com' };
    secondaryBtn = undefined;
  } else {
    // submitted acknowledgment
    badgeText = '✦ APPLICATION RECEIVED ✦';
    badgeType = 'gold';
    heading = 'Application Received';
    subheading = `Thank you for submitting <strong>"${eventTitle}"</strong>. Our administration team is reviewing your event request.`;

    cardsHtml = `
      ${renderNoticeBox({
        title: '📋 WHAT HAPPENS NEXT?',
        type: 'info',
        items: [
          'Our review team checks event guidelines and verification details within 24-48 hours.',
          'Once approved, your event goes live on the Festora platform.',
          'You will receive an automated email with organizer credentials to access your dashboard.',
        ],
      })}
    `;
    primaryBtn = { label: 'VIEW FESTORA', url: baseUrl };
    secondaryBtn = undefined;
  }

  return buildFestoraEmailLayout({
    title: `${isApproved ? 'Event Approved' : isRejected ? 'Event Review Update' : 'Application Received'}: "${eventTitle}" - Festora`,
    preheader: `${heading} - ${eventTitle}`,
    badgeText,
    badgeType,
    heading,
    subheading,
    contentHtml: cardsHtml,
    primaryButton: primaryBtn,
    secondaryButton: secondaryBtn,
    footerNote: 'Festora Event Platform • Automated Status Notification',
  });
}

/**
 * EVENT UPDATE EMAIL (Organizers notify participants)
 */
export interface EventUpdateEmailData {
  recipientName: string;
  eventTitle: string;
  updateTitle?: string;
  updateMessage: string;
  eventDate: string;
  eventTime?: string;
  eventVenue: string;
  eventId?: string;
  eventUrl?: string;
}

export function buildEventUpdateEmailHtml(data: EventUpdateEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const url = data.eventUrl || (data.eventId ? `${baseUrl}/events/${data.eventId}` : `${baseUrl}/events`);

  const cardsHtml = `
    ${renderNoticeBox({
      title: data.updateTitle || '📢 ORGANIZER ANNOUNCEMENT',
      type: 'info',
      items: [
        data.updateMessage,
      ],
    })}

    ${renderEventInfoCard({
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventVenue: data.eventVenue,
    })}
  `;

  return buildFestoraEmailLayout({
    title: `Important Update: "${data.eventTitle}" - Festora`,
    preheader: `Organizer update for ${data.eventTitle}: ${data.updateTitle || 'New announcement'}`,
    badgeText: '✦ EVENT UPDATE NOTIFICATION ✦',
    badgeType: 'gold',
    heading: 'Event Update Notification',
    subheading: `Hello <strong>${data.recipientName}</strong>, the organizer of <strong>"${data.eventTitle}"</strong> has posted an important update.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'VIEW EVENT',
      url,
    },
    footerNote: 'You received this notification because you are a registered participant of this event.',
  });
}

/**
 * EVENT CANCELLATION EMAIL
 */
export interface EventCancellationEmailData {
  recipientName: string;
  eventTitle: string;
  cancellationReason?: string;
  refundPolicyNotes?: string;
  eventDate: string;
  eventVenue: string;
  orderNumber?: string;
  totalAmount?: number;
  currency?: string;
}

export function buildEventCancellationEmailHtml(data: EventCancellationEmailData): string {
  const cardsHtml = `
    ${renderNoticeBox({
      title: '⚠️ CANCELLATION NOTICE',
      type: 'warning',
      items: [
        `The event "${data.eventTitle}" originally scheduled for ${data.eventDate} has been cancelled by the event organizers.`,
        data.cancellationReason ? `Reason: ${data.cancellationReason}` : 'Cancellation initiated by organizer.',
        data.refundPolicyNotes || 'If you purchased paid tickets, full refunds are processed automatically within 5-7 business days.',
      ],
    })}

    ${renderEventInfoCard({
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      eventVenue: data.eventVenue,
      orderId: data.orderNumber,
    })}
  `;

  return buildFestoraEmailLayout({
    title: `Event Cancellation: "${data.eventTitle}" - Festora`,
    preheader: `Notice: "${data.eventTitle}" has been cancelled.`,
    badgeText: '⚠️ EVENT CANCELLATION NOTICE ⚠️',
    badgeType: 'crimson',
    heading: 'Event Cancellation Notice',
    subheading: `Hello <strong>${data.recipientName}</strong>, we regret to inform you that <strong>"${data.eventTitle}"</strong> has been cancelled.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'CONTACT SUPPORT',
      url: 'mailto:festora@221blabs.com',
    },
    footerNote: 'Festora Ticketing Platform • Customer Support Division',
  });
}

/**
 * PAYMENT CONFIRMATION RECEIPT EMAIL
 */
export interface PaymentReceiptEmailData {
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  quantity?: number;
  platformFee?: number;
  totalAmount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  ticketCode?: string;
}

export function buildPaymentReceiptEmailHtml(data: PaymentReceiptEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const ticketsUrl = `${baseUrl}/dashboard/tickets`;

  const cardsHtml = `
    ${renderPaymentCard({
      ticketPrice: data.ticketPrice,
      quantity: data.quantity || 1,
      platformFee: data.platformFee,
      totalAmount: data.totalAmount,
      currency: data.currency || 'INR',
      paymentStatus: 'Paid & Verified',
    })}

    ${data.ticketCode ? `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #141414; border: 1px solid #3f1119; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
            <tr>
              <td style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Ticket Pass Code:</td>
              <td align="right" style="font-family: monospace; font-size: 14px; color: #facc15; font-weight: 700;">#${data.ticketCode}</td>
            </tr>
            <tr>
              <td style="padding-top: 8px; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Order Number:</td>
              <td align="right" style="padding-top: 8px; font-family: monospace; font-size: 13px; color: #ffffff;">#${data.orderNumber}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ` : ''}
  `;

  return buildFestoraEmailLayout({
    title: `Payment Receipt: "${data.eventTitle}" - Festora`,
    preheader: `Payment confirmed for ${data.eventTitle}. Order #${data.orderNumber}`,
    badgeText: '💳 PAYMENT CONFIRMED',
    badgeType: 'green',
    heading: 'Payment Confirmation & Receipt',
    subheading: `Hello <strong>${data.customerName}</strong>, thank you! Your payment for <strong>"${data.eventTitle}"</strong> was successful.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'VIEW TICKET',
      url: ticketsUrl,
    },
    footerNote: 'Festora Payments • Powered by Razorpay & Secure Processing',
  });
}

/**
 * WELCOME EMAIL
 */
export function buildWelcomeEmailHtml(data: { name: string; email?: string }): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const eventsUrl = `${baseUrl}/events`;

  const cardsHtml = `
    ${renderNoticeBox({
      title: '🌟 WHAT YOU CAN DO ON FESTORA',
      type: 'info',
      items: [
        'Explore top college festivals, cultural fests, hackathons, and conferences.',
        'One-click registration with dynamic team pass generation.',
        'Instant entry passes with secure QR codes stored directly in your dashboard.',
        'Real-time event notifications and organizer updates.',
      ],
    })}
  `;

  return buildFestoraEmailLayout({
    title: 'Welcome to Festora! - Premier Events & Experiences',
    preheader: 'Welcome to Festora! Discover college festivals and premier campus events.',
    badgeText: '🎉 WELCOME TO FESTORA',
    badgeType: 'gold',
    heading: 'Welcome to Festora!',
    subheading: `Hello <strong>${data.name}</strong>, congratulations and welcome! We are thrilled to have you join our community of event-goers and organizers.`,
    contentHtml: cardsHtml,
    primaryButton: {
      label: 'EXPLORE EVENTS',
      url: eventsUrl,
    },
    footerNote: 'Festora • 221B Labs • Premier Event & Ticketing Platform',
  });
}

/**
 * ENTERPRISE INQUIRY EMAILS
 */
export function buildEnterpriseInquiryEmailHtml(data: {
  inquiryId: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  role?: string;
  attendees?: string;
  eventType?: string;
  timeline?: string;
  message?: string;
  submittedAt?: string;
  isCustomerConfirmation?: boolean;
}): string {
  const {
    inquiryId,
    name,
    email,
    phone,
    organization,
    role = 'Not Specified',
    attendees = 'Custom / Enterprise Scale',
    eventType = 'General Enterprise Event',
    timeline = 'Flexible / Upcoming',
    message = 'No specific notes provided.',
    submittedAt = new Date().toISOString(),
    isCustomerConfirmation = false,
  } = data;

  if (isCustomerConfirmation) {
    const cardsHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(250, 204, 21, 0.35); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
        <tr>
          <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
              📋 INQUIRY SUMMARY &bull; REF #${inquiryId}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; width: 140px; text-transform: uppercase;">Organization:</td>
                <td style="padding: 5px 0; font-size: 14px; color: #ffffff; font-weight: 700;">${organization}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Event Type:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${eventType}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Scale:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #10b981; font-weight: 600;">${attendees}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Timeline:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #f3f4f6;">${timeline}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${renderNoticeBox({
        title: '💼 WHAT HAPPENS NEXT?',
        type: 'info',
        items: [
          'A dedicated Festora Account Manager will review your requirements.',
          'We will connect via email or phone to schedule a live 15-minute platform walkthrough.',
          'You will receive custom enterprise pricing, SLA details, and trial access.',
        ],
      })}
    `;

    return buildFestoraEmailLayout({
      title: `Enterprise Inquiry Received - Festora`,
      preheader: `Thank you ${name}. Your enterprise inquiry #${inquiryId} has been received.`,
      badgeText: 'FESTORA ENTERPRISE',
      badgeType: 'gold',
      heading: `Thank You, ${name}`,
      subheading: `Your inquiry for <strong>${organization}</strong> has been received. Our enterprise team will respond within 24 business hours.`,
      contentHtml: cardsHtml,
      primaryButton: {
        label: 'VISIT FESTORA',
        url: 'https://festora.221blabs.com',
      },
      footerNote: 'Festora Enterprise Solutions • Dedicated Account Management',
    });
  } else {
    // Admin Notification
    const cardsHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #16060a; border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
        <tr>
          <td style="padding: 16px 20px 10px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #facc15;">
              🏢 ENTERPRISE LEAD DETAILS &bull; REF #${inquiryId}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; width: 140px; text-transform: uppercase;">Organization:</td>
                <td style="padding: 5px 0; font-size: 15px; color: #ffffff; font-weight: 700;">${organization}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Contact Name:</td>
                <td style="padding: 5px 0; font-size: 14px; color: #ffffff;">${name} (${role})</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Email:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #facc15;">
                  <a href="mailto:${email}" style="color: #facc15; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Phone:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #ffffff;">
                  <a href="tel:${phone}" style="color: #ffffff; text-decoration: none;">${phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Scale:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #10b981; font-weight: 700;">${attendees}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Event Type:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #ffffff;">${eventType}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Timeline:</td>
                <td style="padding: 5px 0; font-size: 13.5px; color: #cbd5e1;">${timeline}</td>
              </tr>
            </table>

            ${message ? `
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #22080e;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af;">Requirements / Notes:</span>
              <p style="margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap;">${message}</p>
            </div>
            ` : ''}
          </td>
        </tr>
      </table>
    `;

    return buildFestoraEmailLayout({
      title: `Enterprise Inquiry: ${organization} - Festora`,
      preheader: `New enterprise inquiry from ${name} (${organization}). Scale: ${attendees}`,
      badgeText: '✦ ENTERPRISE LEAD INBOUND ✦',
      badgeType: 'gold',
      heading: 'Enterprise Inquiry Received',
      subheading: `Inbound enterprise request from <strong>${organization}</strong> submitted at ${submittedAt}.`,
      contentHtml: cardsHtml,
      primaryButton: {
        label: `REPLY TO ${name.toUpperCase()}`,
        url: `mailto:${email}?subject=Re:%20Festora%20Enterprise%20Inquiry%20[${inquiryId}]`,
      },
      footerNote: 'Festora Enterprise Inbound Dispatch • 221B Labs',
    });
  }
}
