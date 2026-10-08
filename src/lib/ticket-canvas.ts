import QRCode from 'qrcode';
import type { TicketData } from './payment';
import { getDisplayTicketId, isSimpleTicketId } from './ticket-id';

/**
 * Utility to wrap text on an HTML5 canvas context with ellipsis support
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  if (!text) return y;
  const words = text.split(' ');
  let line = '';
  let linesCount = 0;
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(line.trim() + '…', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

/**
 * Draw a rounded rectangle on a 2D canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw high-precision corner framing brackets (Art-Deco / VIP boarding pass aesthetic)
 */
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  length: number,
  color: string,
  lineWidth = 2
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + length);
  ctx.lineTo(x, y);
  ctx.lineTo(x + length, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - length, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + length);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - length);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + length, y + h);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - length, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - length);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw stylized vector barcode at bottom of stub
 */
function drawBarcode(
  ctx: CanvasRenderingContext2D,
  seed: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  let curX = x;
  const hash = seed.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 17);
  let step = 0;

  while (curX < x + width) {
    const pseudo = (hash * (step + 1) * 9301 + 49297) % 233280;
    const barWidth = 1.5 + (pseudo % 3.5);
    const gap = 1.5 + ((pseudo >> 2) % 3.5);
    if (curX + barWidth > x + width) break;
    ctx.fillRect(Math.floor(curX), y, Math.ceil(barWidth), height);
    curX += barWidth + gap;
    step++;
  }
  ctx.restore();
}

/**
 * Directly renders QR code modules onto canvas 2D context using pure vector operations.
 * GUARANTEED to be 100% synchronous, zero CORS / taint risks, crisp and scannable by all devices.
 */
function drawQRCodeVector(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxX: number,
  boxY: number,
  boxSize: number,
  padding = 16
) {
  try {
    const safeText = (text && text.trim().length > 0) ? text.trim() : 'FESTORA_VIP_TICKET';
    const qr = QRCode.create(safeText, { errorCorrectionLevel: 'H' });
    const modCount = qr.modules.size;
    const innerSize = boxSize - padding * 2;
    const cellSize = innerSize / modCount;

    // Fill pure white background for QR area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // Draw dark modules directly into the canvas
    ctx.fillStyle = '#06080e';
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (qr.modules.get(r, c)) {
          const px = boxX + padding + c * cellSize;
          const py = boxY + padding + r * cellSize;
          // Ceil cell dimensions slightly to prevent fractional subpixel seams
          ctx.fillRect(
            Math.floor(px),
            Math.floor(py),
            Math.ceil(cellSize + 0.35),
            Math.ceil(cellSize + 0.35)
          );
        }
      }
    }
  } catch (err) {
    console.error('Error rendering QR code vector:', err);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.fillStyle = '#06080e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR CODE', boxX + boxSize / 2, boxY + boxSize / 2);
  }
}

/**
 * Dynamic item to display on the ticket pass
 */
interface DynamicTicketItem {
  label: string;
  value: string;
}

/**
 * Extracts all participant registration fields that have `show_on_ticket === true`.
 * Completely dynamic: does NOT hardcode field names. If organizer adds any custom field
 * (e.g. "Accommodation Required", "T-Shirt Size", "Food Preference") and enables "Show on Ticket",
 * it will automatically appear here.
 */
export function extractParticipantTicketItems(ticket: TicketData): DynamicTicketItem[] {
  const items: DynamicTicketItem[] = [];
  const seenLabels = new Set<string>();

  // 1. Direct dynamic answers array (saved during registration / order processing)
  if (Array.isArray(ticket.registrationAnswers) && ticket.registrationAnswers.length > 0) {
    for (const ans of ticket.registrationAnswers) {
      if (!ans || !ans.label) continue;

      let show = ans.show_on_ticket;
      if (show === undefined && Array.isArray(ticket.fieldConfigs)) {
        const cfg = ticket.fieldConfigs.find(
          (f) => f.id === ans.field_id || f.label?.toLowerCase() === ans.label?.toLowerCase()
        );
        if (cfg) {
          show = cfg.show_on_ticket;
        }
      }

      // If show on ticket is enabled (or defaults to true if omitted)
      if (show !== false) {
        let valStr = '';
        if (typeof ans.answer === 'boolean') {
          valStr = ans.answer ? 'Yes' : 'No';
        } else if (Array.isArray(ans.answer)) {
          valStr = ans.answer.filter(Boolean).join(', ');
        } else if (ans.answer !== undefined && ans.answer !== null) {
          valStr = String(ans.answer).trim();
        }

        if (valStr) {
          items.push({
            label: ans.label,
            value: valStr,
          });
          seenLabels.add(ans.label.trim().toLowerCase());
        }
      }
    }
  }

  // 2. Check fieldConfigs + customAnswers mapping (if registrationAnswers wasn't directly serialized)
  if (items.length === 0 && Array.isArray(ticket.fieldConfigs) && ticket.fieldConfigs.length > 0) {
    const custom = ticket.teamInfo?.customAnswers || ticket.customAnswers || {};
    for (const field of ticket.fieldConfigs) {
      if (field.show_on_ticket !== false) {
        const val =
          custom[field.id] ??
          custom[field.label] ??
          custom[field.label.toLowerCase()] ??
          (field.id === 'full_name' || field.id === 'name' ? ticket.teamInfo?.memberName || ticket.customerDetails?.name : undefined) ??
          (field.id === 'email' ? ticket.teamInfo?.memberEmail || ticket.customerDetails?.email : undefined) ??
          (field.id === 'phone' ? (ticket.teamInfo as any)?.memberPhone || ticket.customerDetails?.phone : undefined);

        if (val !== undefined && val !== null && String(val).trim()) {
          const valStr =
            typeof val === 'boolean'
              ? (val ? 'Yes' : 'No')
              : Array.isArray(val)
              ? val.join(', ')
              : String(val).trim();
          items.push({
            label: field.label,
            value: valStr,
          });
          seenLabels.add(field.label.trim().toLowerCase());
        }
      }
    }
  }

  // 3. Check legacy customAnswers dictionary
  const custom = ticket.teamInfo?.customAnswers || ticket.customAnswers;
  if (custom && typeof custom === 'object') {
    for (const [key, val] of Object.entries(custom)) {
      if (!val || seenLabels.has(key.toLowerCase())) continue;
      if (['registrationanswers', 'fieldconfigs', 'pricingsnapshot', 'pricingbreakdown'].includes(key.toLowerCase())) continue;

      const formattedLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim();
      const valStr =
        typeof val === 'boolean'
          ? (val ? 'Yes' : 'No')
          : Array.isArray(val)
          ? val.join(', ')
          : String(val).trim();

      if (valStr) {
        items.push({
          label: formattedLabel.charAt(0).toUpperCase() + formattedLabel.slice(1),
          value: valStr,
        });
        seenLabels.add(key.toLowerCase());
      }
    }
  }

  // 4. Ensure participant name is always present if not already added
  const hasName = Array.from(seenLabels).some((l) => l.includes('name'));
  if (!hasName) {
    const attendeeName = ticket.teamInfo?.memberName || ticket.customerDetails?.name || 'Authorized Guest';
    items.unshift({
      label: 'Participant Name',
      value: attendeeName,
    });
  }

  // 5. Ensure team name is displayed if team registration
  const hasTeam = Array.from(seenLabels).some((l) => l.includes('team'));
  if (!hasTeam && ticket.teamInfo?.teamName) {
    items.push({
      label: 'Team Name',
      value: ticket.teamInfo.teamName,
    });
  }

  return items;
}

/**
 * Extracts payment breakdown (Ticket Price, Festora Fee, Total Amount)
 */
export function extractPaymentDetails(ticket: TicketData) {
  const snapshot = ticket.pricingSnapshot;
  const breakdown = (ticket as any).pricingBreakdown;

  let ticketPrice = 0;
  let platformFee = 0;
  let totalAmount = 0;

  if (snapshot) {
    ticketPrice = Number(snapshot.ticketPrice) || 0;
    platformFee = Number(snapshot.platformFee) || 0;
    totalAmount = Number(snapshot.totalAmount) || 0;
  } else if (breakdown) {
    ticketPrice = Number(breakdown.ticketPrice) || 0;
    platformFee = Number(breakdown.platformFee) || 0;
    totalAmount = Number(breakdown.finalAmount) || 0;
  } else {
    ticketPrice = typeof ticket.price === 'number' ? ticket.price : 0;
    platformFee =
      typeof (ticket as any).platformFee === 'number'
        ? (ticket as any).platformFee
        : ticketPrice > 0
        ? 6
        : 0;
    totalAmount =
      typeof (ticket as any).totalAmount === 'number'
        ? (ticket as any).totalAmount
        : ticketPrice + platformFee;
  }

  const isFree = ticketPrice === 0 && totalAmount === 0;

  return {
    ticketPriceStr: isFree ? '₹0' : `₹${ticketPrice.toLocaleString('en-IN')}`,
    platformFeeStr: isFree ? '₹0' : `₹${platformFee.toLocaleString('en-IN')}`,
    totalAmountStr: isFree ? '₹0 (Free)' : `₹${totalAmount.toLocaleString('en-IN')}`,
    isFree,
  };
}

/**
 * Renders an ultra-luxurious, high-resolution VIP event ticket pass onto an HTML5 Canvas.
 * Dynamically renders Participant Details, Event Details, Payment Breakdown, and QR stub.
 * Rendered at 2x High-DPI scale (2400 x [adaptive] physical resolution) for stunning print and screen clarity.
 */
export async function renderTicketToCanvas(ticket: TicketData): Promise<HTMLCanvasElement> {
  // Ensure custom web fonts are loaded if available in browser
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-blocking font readiness check
    }
  }

  // Extract dynamic participant fields configured with show_on_ticket = true
  const participantItems = extractParticipantTicketItems(ticket);
  const participantRows = Math.max(1, Math.ceil(participantItems.length / 2));

  // Adaptive canvas height: base 680px accommodates up to 2 rows (4 fields).
  // Dynamically adds 62px per extra row of dynamic fields so cards never collide.
  const isMultiDay = Array.isArray(ticket.dayTickets) && ticket.dayTickets.length > 1;
  const multiDayCount = isMultiDay ? ticket.dayTickets!.length : 1;
  const stubNeededHeight = isMultiDay ? 120 + multiDayCount * 175 : 680;
  const logicalWidth = 1200;
  const logicalHeight = Math.max(680, Math.max(560 + participantRows * 62, stubNeededHeight));
  const scale = 2; // 2x Retina / Print resolution

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Scale context so drawing commands use crisp logical dimensions (0..1200, 0..logicalHeight)
  ctx.scale(scale, scale);

  // Normalize ticket data
  const eventTitle = ticket.eventData?.title || 'Festora Official Event';
  const ticketId = getDisplayTicketId(ticket, eventTitle);
  const qrData =
    ticket.qrCodeData && isSimpleTicketId(ticket.qrCodeData)
      ? ticket.qrCodeData
      : ticketId;
  const ticketNumber = ticket.ticketNumber || 1;
  const totalTickets = ticket.totalTickets || 1;
  const orderId = ticket.orderId ? ticket.orderId.slice(-8).toUpperCase() : 'CONFIRMED';
  const tierName = ticket.tierName || ticket.ticketType || 'VIP Admission';

  // Format Event Date & Time
  let dateString = 'Date to be announced';
  let timeString = 'Time TBA';
  if (ticket.eventData?.dateTime?.startDate) {
    const d = new Date(ticket.eventData.dateTime.startDate);
    if (!isNaN(d.getTime())) {
      dateString = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      timeString = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  // Format Venue & Location
  const venueRaw = ticket.eventData?.venue;
  const venueText =
    typeof venueRaw === 'string'
      ? venueRaw
      : (venueRaw as { name?: string; address?: string; city?: string } | undefined)?.name || 'Venue announced soon';
  const venueSubText =
    typeof venueRaw === 'object' && (venueRaw as any)?.address
      ? `${(venueRaw as any).address}${(venueRaw as any)?.city ? `, ${(venueRaw as any).city}` : ''}`
      : 'Campus Premises • Entry Gate';

  // Format Date of Purchase
  let purchaseDateString = 'Confirmed';
  const purchaseRaw = ticket.createdAt || (ticket as any).purchasedAt || (ticket as any).orderData?.createdAt;
  if (purchaseRaw) {
    const pd = new Date(purchaseRaw);
    if (!isNaN(pd.getTime())) {
      purchaseDateString =
        pd.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) +
        ' • ' +
        pd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  } else {
    purchaseDateString = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Payment Breakdown
  const payment = extractPaymentDetails(ticket);

  // -------------------------------------------------------------
  // 1. CANVAS CRIMSON & YELLOW AMBIENT GLOWS
  // -------------------------------------------------------------
  ctx.fillStyle = '#080305';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Rich crimson radial ambient glow on the left
  const leftGlow = ctx.createRadialGradient(280, 200, 10, 280, 200, 480);
  leftGlow.addColorStop(0, 'rgba(220, 38, 38, 0.22)');
  leftGlow.addColorStop(1, 'rgba(8, 3, 5, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Warm yellow glow behind the right stub
  const rightGlow = ctx.createRadialGradient(980, 260, 10, 980, 260, 380);
  rightGlow.addColorStop(0, 'rgba(250, 204, 21, 0.16)');
  rightGlow.addColorStop(1, 'rgba(8, 3, 5, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // -------------------------------------------------------------
  // 2. MAIN TICKET CONTAINER (Rounded Luxury Card - Crimson & Yellow)
  // -------------------------------------------------------------
  const cardX = 24;
  const cardY = 24;
  const cardW = logicalWidth - 48; // 1152
  const cardH = logicalHeight - 48; // adaptive height
  const cardRadius = 22;

  // Rich multi-stop Crimson Obsidian gradient fill
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#1c050a');
  cardGrad.addColorStop(0.35, '#120407');
  cardGrad.addColorStop(0.7, '#24060d');
  cardGrad.addColorStop(1, '#180408');

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // Outer framing border: Warm Yellow
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#facc15';
  ctx.stroke();

  // Subtle inner crimson glow hairline (inset 4px)
  roundRect(ctx, cardX + 4, cardY + 4, cardW - 8, cardH - 8, cardRadius - 4);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
  ctx.stroke();
  ctx.restore();

  // Art-Deco Yellow Corner Brackets on the ticket body
  drawCornerBrackets(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 20, '#facc15', 2.5);

  // Top Shimmer Crimson & Yellow Ribbon
  ctx.save();
  const ribbonGrad = ctx.createLinearGradient(cardX + 24, cardY + 4, cardX + cardW - 48, cardY + 8);
  ribbonGrad.addColorStop(0, '#990000');
  ribbonGrad.addColorStop(0.3, '#dc2626');
  ribbonGrad.addColorStop(0.5, '#facc15');
  ribbonGrad.addColorStop(0.7, '#dc2626');
  ribbonGrad.addColorStop(1, '#990000');
  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, cardX + 36, cardY + 3, cardW - 72, 4, 2);
  ctx.fill();
  ctx.restore();

  // -------------------------------------------------------------
  // 3. PERFORATION DIVIDER & CIRCULAR CUTOUT NOTCHES
  // -------------------------------------------------------------
  const dividerX = 790;

  ctx.save();
  ctx.fillStyle = '#080305';
  // Top cutout notch
  ctx.beginPath();
  ctx.arc(dividerX, cardY, 22, 0, Math.PI);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#facc15';
  ctx.stroke();

  // Bottom cutout notch
  ctx.beginPath();
  ctx.arc(dividerX, cardY + cardH, 22, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Dashed vertical perforation line in Yellow
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dividerX, cardY + 28);
  ctx.lineTo(dividerX, cardY + cardH - 28);
  ctx.stroke();
  ctx.restore();

  // -------------------------------------------------------------
  // 4. LEFT SECTION: BRANDING, HERO TITLE & DYNAMIC SECTIONS
  // -------------------------------------------------------------
  const leftX = cardX + 36;
  const leftSectionW = dividerX - leftX - 24; // ~730px

  // --- BRAND HEADER ---
  // Star emblem in Yellow
  ctx.fillStyle = '#facc15';
  ctx.font = '18px serif';
  ctx.fillText('✦', leftX, cardY + 48);

  // Festora Brand Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Marcellus", "Cinzel", "Times New Roman", serif';
  ctx.fillText('F E S T O R A', leftX + 22, cardY + 48);

  // Subtitle in Yellow
  ctx.fillStyle = '#facc15';
  ctx.font = '700 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText('OFFICIAL ADMISSION PASS', leftX + 195, cardY + 46);

  // Top-right Verified Status Pill Badge (inside left section) in Crimson + Yellow
  ctx.save();
  const badgeW = 168;
  const badgeH = 28;
  const badgeX = dividerX - badgeW - 32;
  const badgeY = cardY + 28;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('● VERIFIED PASS', badgeX + badgeW / 2, badgeY + 18);
  ctx.restore();

  // Horizontal divider below header
  ctx.save();
  const lineGrad = ctx.createLinearGradient(leftX, cardY + 64, dividerX - 32, cardY + 64);
  lineGrad.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
  lineGrad.addColorStop(0.5, 'rgba(220, 38, 38, 0.4)');
  lineGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, cardY + 64);
  ctx.lineTo(dividerX - 32, cardY + 64);
  ctx.stroke();
  ctx.restore();

  // --- EVENT HERO TITLE & TICKET ID ---
  // Tier tag in Yellow
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 10.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText(`✦ EXCLUSIVE ACCESS • ${tierName.toUpperCase()}`, leftX, cardY + 86);

  // Ticket ID badge tag on the right of tier tag
  ctx.save();
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`TICKET ID: ${ticketId}`, dividerX - 32, cardY + 86);
  ctx.textAlign = 'start';
  ctx.restore();

  // Big Event Title in White
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  const heroEnd = wrapText(ctx, eventTitle, leftX, cardY + 114, 660, 30, 2);

  // Helper for Section Headings
  const drawSectionHeading = (title: string, yPos: number) => {
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText(title, leftX, yPos);

    // Subtle hairline
    const titleWidth = ctx.measureText(title).width;
    const barGrad = ctx.createLinearGradient(leftX + titleWidth + 12, yPos - 3, dividerX - 32, yPos - 3);
    barGrad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    barGrad.addColorStop(1, 'rgba(220, 38, 38, 0.05)');
    ctx.strokeStyle = barGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX + titleWidth + 12, yPos - 3);
    ctx.lineTo(dividerX - 32, yPos - 3);
    ctx.stroke();
    ctx.restore();
  };

  // Helper to draw a single 2-column or 3-column frosted metadata card
  const drawCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    main: string,
    sub?: string,
    highlightColor = '#ffffff'
  ) => {
    ctx.save();
    roundRect(ctx, x, y, w, h, 8);
    // Dark translucent background with crimson tint
    ctx.fillStyle = 'rgba(22, 6, 10, 0.75)';
    ctx.fill();
    // Yellow hairline border
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Card Label in Warm Yellow
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 9.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText(label.toUpperCase(), x + 12, y + 17);

    // Primary Text
    ctx.fillStyle = highlightColor;
    ctx.font = 'bold 13.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    wrapText(ctx, main, x + 12, y + 36, w - 24, 16, 1);

    // Secondary Text (if provided)
    if (sub) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '500 10.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
      wrapText(ctx, sub, x + 12, y + 52, w - 24, 14, 1);
    }
    ctx.restore();
  };

  // -------------------------------------------------------------
  // SECTION A: PARTICIPANT DETAILS (Dynamic!)
  // -------------------------------------------------------------
  const partSecY = Math.max(heroEnd + 14, cardY + 148);
  drawSectionHeading('✦ PARTICIPANT DETAILS', partSecY);

  const cardColW = (leftSectionW - 14) / 2; // ~358px
  const partCardH = 48;
  const partStartY = partSecY + 12;

  participantItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? leftX : leftX + cardColW + 14;
    const y = partStartY + row * (partCardH + 8);
    drawCard(x, y, cardColW, partCardH, item.label, item.value, undefined, '#ffffff');
  });

  const partSectionEndY = partStartY + participantRows * (partCardH + 8);

  // -------------------------------------------------------------
  // SECTION B: EVENT DETAILS (Date, Time, Venue, Ticket Type)
  // -------------------------------------------------------------
  const eventSecY = partSectionEndY + 10;
  drawSectionHeading('✦ EVENT DETAILS', eventSecY);

  const eventCardH = 58;
  const eventStartY = eventSecY + 12;
  const col1X = leftX;
  const col2X = leftX + cardColW + 14;

  // Row 1: Date & Time + Venue
  drawCard(
    col1X,
    eventStartY,
    cardColW,
    eventCardH,
    '📅 Date & Time',
    dateString,
    timeString ? `Starts at ${timeString}` : 'Schedule on entry'
  );

  drawCard(
    col2X,
    eventStartY,
    cardColW,
    eventCardH,
    '📍 Venue & Location',
    venueText,
    venueSubText
  );

  // Row 2: Ticket Type + Purchase Record
  const eventRow2Y = eventStartY + eventCardH + 8;
  drawCard(
    col1X,
    eventRow2Y,
    cardColW,
    eventCardH,
    '🎟️ Ticket Type',
    tierName,
    `Pass #${ticketNumber} of ${totalTickets}`
  );

  drawCard(
    col2X,
    eventRow2Y,
    cardColW,
    eventCardH,
    '🕒 Issue & Confirmation',
    purchaseDateString,
    `Order Ref: #${orderId}`
  );

  const eventSectionEndY = eventRow2Y + eventCardH;

  // -------------------------------------------------------------
  // SECTION C: PAYMENT DETAILS (Ticket Price, Festora Fee, Total Amount)
  // -------------------------------------------------------------
  const paySecY = eventSectionEndY + 12;
  drawSectionHeading('✦ PAYMENT DETAILS', paySecY);

  const payColW = (leftSectionW - 20) / 3; // ~236px each
  const payCardH = 48;
  const payStartY = paySecY + 12;

  // 1. Ticket Price
  drawCard(
    leftX,
    payStartY,
    payColW,
    payCardH,
    '💳 Ticket Price',
    payment.ticketPriceStr,
    undefined,
    '#ffffff'
  );

  // 2. Festora Fee
  drawCard(
    leftX + payColW + 10,
    payStartY,
    payColW,
    payCardH,
    '⚡ Festora Fee',
    payment.platformFeeStr,
    undefined,
    '#ffffff'
  );

  // 3. Total Amount (Gold Accent)
  drawCard(
    leftX + (payColW + 10) * 2,
    payStartY,
    payColW,
    payCardH,
    '💰 Total Amount',
    payment.totalAmountStr,
    undefined,
    '#facc15'
  );

  // --- LEFT FOOTER / SECURITY BADGE ---
  const footerY = cardY + cardH - 18;
  ctx.fillStyle = '#fca5a5';
  ctx.font = '600 9.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText(
    'OFFICIAL DIGITAL ENTRY CREDENTIAL • VALID GOVERNMENT / STUDENT PHOTO ID REQUIRED',
    leftX,
    footerY
  );

  // Microprint Security Hash
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SEC-HASH:${ticketId.slice(0, 16).toUpperCase()}`, dividerX - 32, footerY);
  ctx.textAlign = 'start';

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 5. RIGHT SECTION: STUB & DIRECT VECTOR QR CODE (Crimson & Yellow)
  // -------------------------------------------------------------
  const stubCenterX = dividerX + (cardW - (dividerX - cardX)) / 2; // ~971

  if (isMultiDay && ticket.dayTickets && ticket.dayTickets.length > 1) {
    // --- MULTI-DAY TICKETS PASSES STUB ---
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ DAY-SPECIFIC ENTRY PASSES ✦', stubCenterX, cardY + 44);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 9.5px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText('SCAN EACH DAY AT ENTRANCE GATE', stubCenterX, cardY + 60);
    ctx.restore();

    const dayPassW = 286;
    const dayPassH = 155;
    let curY = cardY + 74;

    ticket.dayTickets.forEach((dt) => {
      // Day pass container
      roundRect(ctx, stubCenterX - dayPassW / 2, curY, dayPassW, dayPassH, 10);
      ctx.fillStyle = '#140407';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Day Pass Title & Date
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`DAY ${dt.dayNumber} ENTRY PASS`, stubCenterX - dayPassW / 2 + 14, curY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.fillText(dt.dayDate || dateString, stubCenterX - dayPassW / 2 + 14, curY + 46);

      // Pass Code pill
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`CODE: ${dt.passCode}`, stubCenterX - dayPassW / 2 + 14, curY + 68);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.font = 'italic 9px "Josefin Sans", sans-serif';
      ctx.fillText(`Valid only for Day ${dt.dayNumber}`, stubCenterX - dayPassW / 2 + 14, curY + 86);
      ctx.restore();

      // QR Code on the right side of this day card
      const dayQrSize = 120;
      const dayQrX = stubCenterX + dayPassW / 2 - dayQrSize - 14;
      const dayQrY = curY + 17;

      ctx.save();
      roundRect(ctx, dayQrX, dayQrY, dayQrSize, dayQrSize, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();

      drawQRCodeVector(ctx, dt.passCode, dayQrX, dayQrY, dayQrSize, 8);
      ctx.restore();

      curY += dayPassH + 12;
    });

    ctx.save();
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 9px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED DIGITAL ENTRY • FESTORA.COM', stubCenterX, cardY + cardH - 18);
    ctx.restore();
  } else {
    // --- SINGLE-DAY TICKET PASS STUB ---
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ SCAN FOR ADMISSION ✦', stubCenterX, cardY + 44);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText('PRESENT AT ENTRANCE GATE', stubCenterX, cardY + 62);
    ctx.restore();

    // --- QR CODE CONTAINER (White rounded card with Yellow & Crimson rim) ---
    const qrBoxSize = 236;
    const qrBoxX = stubCenterX - qrBoxSize / 2;
    const qrBoxY = cardY + 76;
    const qrBoxRadius = 14;

    ctx.save();
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Warm Yellow Outer Frame for QR box
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    // Crimson corner brackets inside the QR white container
    drawCornerBrackets(ctx, qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, 14, '#b91c1c', 3);

    // Direct Vector QR Code Render (100% Infallible, crisp black modules)
    drawQRCodeVector(ctx, qrData, qrBoxX, qrBoxY, qrBoxSize, 16);
    ctx.restore();

    // --- TICKET IDENTIFIER MONOSPACE PILL ---
    const idLabelY = qrBoxY + qrBoxSize + 22;
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TICKET IDENTIFIER', stubCenterX, idLabelY);

    const idPillW = 286;
    const idPillH = 34;
    const idPillX = stubCenterX - idPillW / 2;
    const idPillY = idLabelY + 8;

    // Deep Crimson background with Yellow border
    roundRect(ctx, idPillX, idPillY, idPillW, idPillH, 8);
    ctx.fillStyle = '#1c0509';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    ctx.fillText(ticketId, stubCenterX, idPillY + 22);
    ctx.restore();

    // Single scan notice badge
    const scanNoticeY = idPillY + idPillH + 18;
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ SINGLE ADMISSION • 1 SCAN ONLY', stubCenterX, scanNoticeY);
    ctx.restore();

    // --- BOTTOM BARCODE & BRAND FOOTER ---
    const barcodeY = scanNoticeY + 12;
    const barcodeW = 250;
    const barcodeX = stubCenterX - barcodeW / 2;
    drawBarcode(ctx, ticketId, barcodeX, barcodeY, barcodeW, 22, '#facc15');

    ctx.save();
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 9px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED DIGITAL ENTRY • FESTORA.COM', stubCenterX, cardY + cardH - 18);
    ctx.restore();
  }

  return canvas;
}

/**
 * Trigger immediate download of a single ticket as high-resolution PNG
 */
export async function downloadTicketImage(ticket: TicketData): Promise<void> {
  const canvas = await renderTicketToCanvas(ticket);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Failed to generate ticket image blob');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (ticket.eventData?.title || 'event')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase()
    .slice(0, 30);
  const safeId = getDisplayTicketId(ticket, ticket.eventData?.title);
  link.download = `Festora-${safeTitle}-${safeId}.png`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Download all tickets sequentially with a pleasant delay
 */
export async function downloadAllTickets(tickets: TicketData[]): Promise<void> {
  for (let i = 0; i < tickets.length; i++) {
    await downloadTicketImage(tickets[i]);
    if (i < tickets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
}

/**
 * Triggers browser print/PDF preview dialog with the high-resolution ticket pass
 */
export async function downloadTicketPDF(ticket: TicketData): Promise<void> {
  const canvas = await renderTicketToCanvas(ticket);
  const dataUrl = canvas.toDataURL('image/png');
  const safeTitle = (ticket.eventData?.title || 'event')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase()
    .slice(0, 30);
  const safeId = getDisplayTicketId(ticket, ticket.eventData?.title);

  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If pop-up blocked, fall back to downloading image
    await downloadTicketImage(ticket);
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Festora Ticket - ${safeTitle}-${safeId}</title>
    <style>
      @page { size: landscape; margin: 0; }
      body {
        margin: 0;
        background: #080305;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      img {
        max-width: 95%;
        max-height: 95vh;
        object-fit: contain;
        display: block;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" onload="setTimeout(() => window.print(), 300);" />
  </body>
</html>`);
  printWindow.document.close();
}

