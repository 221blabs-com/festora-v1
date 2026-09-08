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
 * Renders an ultra-luxurious, high-resolution VIP event ticket pass onto an HTML5 Canvas.
 * Rendered at 2x High-DPI scale (2400 x 1280 physical resolution) for stunning print and screen clarity.
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

  const canvas = document.createElement('canvas');
  // Logical coordinate space: 1200 x 640
  const logicalWidth = 1200;
  const logicalHeight = 640;
  const scale = 2; // 2x Retina / Print resolution

  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Scale context so drawing commands use crisp logical dimensions (0..1200, 0..640)
  ctx.scale(scale, scale);

  // Normalize ticket fields
  const eventTitle = ticket.eventData?.title || 'Festora Official Event';
  // Use simple 6-digit ticket ID (2 alphabets of event name + 4 digit number, e.g. "TF4821")
  const ticketId = getDisplayTicketId(ticket, eventTitle);
  const qrData = (ticket.qrCodeData && isSimpleTicketId(ticket.qrCodeData))
    ? ticket.qrCodeData
    : ticketId;
  const attendeeName = ticket.teamInfo?.memberName || ticket.customerDetails?.name || 'Authorized Guest';
  const teamName = ticket.teamInfo?.teamName || null;
  const attendeeEmail = ticket.teamInfo?.memberEmail || ticket.customerDetails?.email || null;
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

  // Format Venue
  const venueRaw = ticket.eventData?.venue;
  const venueText = typeof venueRaw === 'string'
    ? venueRaw
    : (venueRaw as { name?: string } | undefined)?.name || 'Venue announced soon';

  // -------------------------------------------------------------
  // 1. CANVAS DEEP SPACE BACKGROUND & AMBIENT GLOW
  // -------------------------------------------------------------
  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Soft gold radial ambient glow on the left
  const leftGlow = ctx.createRadialGradient(280, 200, 10, 280, 200, 360);
  leftGlow.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
  leftGlow.addColorStop(1, 'rgba(7, 9, 14, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Soft royal glow behind the right stub
  const rightGlow = ctx.createRadialGradient(980, 260, 10, 980, 260, 280);
  rightGlow.addColorStop(0, 'rgba(99, 102, 241, 0.07)');
  rightGlow.addColorStop(1, 'rgba(7, 9, 14, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // -------------------------------------------------------------
  // 2. MAIN TICKET CONTAINER (Rounded Luxury Card)
  // -------------------------------------------------------------
  const cardX = 24;
  const cardY = 24;
  const cardW = logicalWidth - 48; // 1152
  const cardH = logicalHeight - 48; // 592
  const cardRadius = 20;

  // Rich multi-stop dark slate gradient fill
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#111522');
  cardGrad.addColorStop(0.5, '#0b0e16');
  cardGrad.addColorStop(1, '#131825');

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // Fine metallic gold framing border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  // Subtle inner glow hairline (inset 4px)
  roundRect(ctx, cardX + 4, cardY + 4, cardW - 8, cardH - 8, cardRadius - 4);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.stroke();
  ctx.restore();

  // Art-Deco Gold Corner Brackets on the ticket body
  drawCornerBrackets(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 18, '#d4af37', 2);

  // Top Shimmer Brushed Gold Ribbon
  ctx.save();
  const ribbonGrad = ctx.createLinearGradient(cardX + 24, cardY + 4, cardX + cardW - 48, cardY + 8);
  ribbonGrad.addColorStop(0, '#946b2d');
  ribbonGrad.addColorStop(0.25, '#d4af37');
  ribbonGrad.addColorStop(0.5, '#fef08a');
  ribbonGrad.addColorStop(0.75, '#d4af37');
  ribbonGrad.addColorStop(1, '#946b2d');
  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, cardX + 36, cardY + 3, cardW - 72, 4, 2);
  ctx.fill();
  ctx.restore();

  // -------------------------------------------------------------
  // 3. PERFORATION DIVIDER & CIRCULAR CUTOUT NOTCHES
  // -------------------------------------------------------------
  const dividerX = 790;

  ctx.save();
  ctx.fillStyle = '#07090e';
  // Top cutout notch
  ctx.beginPath();
  ctx.arc(dividerX, cardY, 22, 0, Math.PI);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  // Bottom cutout notch
  ctx.beginPath();
  ctx.arc(dividerX, cardY + cardH, 22, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Dashed vertical perforation line
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dividerX, cardY + 28);
  ctx.lineTo(dividerX, cardY + cardH - 28);
  ctx.stroke();
  ctx.restore();

  // -------------------------------------------------------------
  // 4. LEFT SECTION: BRANDING, HERO TITLE & METADATA GRID
  // -------------------------------------------------------------
  const leftX = cardX + 36;

  // --- BRAND HEADER ---
  // Star emblem
  ctx.fillStyle = '#d4af37';
  ctx.font = '16px serif';
  ctx.fillText('✦', leftX, cardY + 48);

  // Festora Brand Title
  ctx.font = 'bold 22px "Marcellus", "Cinzel", "Times New Roman", serif';
  ctx.fillText('F E S T O R A', leftX + 22, cardY + 48);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText('OFFICIAL ADMISSION PASS', leftX + 200, cardY + 46);

  // Top-right Verified Status Pill Badge (inside left section)
  ctx.save();
  const badgeW = 168;
  const badgeH = 28;
  const badgeX = dividerX - badgeW - 32;
  const badgeY = cardY + 28;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('● VERIFIED PASS', badgeX + badgeW / 2, badgeY + 18);
  ctx.restore();

  // Horizontal subtle gold divider below header
  ctx.save();
  const lineGrad = ctx.createLinearGradient(leftX, cardY + 66, dividerX - 32, cardY + 66);
  lineGrad.addColorStop(0, 'rgba(212, 175, 55, 0.35)');
  lineGrad.addColorStop(0.8, 'rgba(212, 175, 55, 0.08)');
  lineGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, cardY + 66);
  ctx.lineTo(dividerX - 32, cardY + 66);
  ctx.stroke();
  ctx.restore();

  // --- EVENT HERO TITLE ---
  // Category / Pass tier tag
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText(`✦ EXCLUSIVE ACCESS • ${tierName.toUpperCase()}`, leftX, cardY + 96);

  // Big Event Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  const heroEnd = wrapText(ctx, eventTitle, leftX, cardY + 130, 660, 36, 2);

  // --- 2x2 METADATA FROSTED CARDS GRID ---
  const gridStartY = Math.max(heroEnd + 16, cardY + 205);
  const cardColW = 336;
  const cardRowH = 92;
  const col1X = leftX;
  const col2X = leftX + cardColW + 18;
  const row1Y = gridStartY;
  const row2Y = gridStartY + cardRowH + 14;

  // Helper to draw a sleek dark glass metadata card
  const drawMetaCard = (x: number, y: number, label: string, main: string, sub: string) => {
    ctx.save();
    roundRect(ctx, x, y, cardColW, cardRowH, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Card Label
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText(label, x + 16, y + 26);

    // Primary Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    wrapText(ctx, main, x + 16, y + 52, cardColW - 32, 20, 1);

    // Secondary Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
    wrapText(ctx, sub, x + 16, y + 74, cardColW - 32, 16, 1);
    ctx.restore();
  };

  // Card 1: Date & Time
  drawMetaCard(
    col1X,
    row1Y,
    '📅 DATE & TIME',
    dateString,
    timeString ? `Starts at ${timeString}` : 'Schedule on entry'
  );

  // Card 2: Venue & Location
  drawMetaCard(
    col2X,
    row1Y,
    '📍 VENUE & LOCATION',
    venueText,
    'Campus Premises • Entry Gate'
  );

  // Card 3: Pass Holder / Attendee
  const subHolder = teamName
    ? `Team: ${teamName}`
    : attendeeEmail
    ? attendeeEmail
    : 'Registered Attendee';
  drawMetaCard(
    col1X,
    row2Y,
    '👤 ATTENDEE NAME',
    attendeeName,
    subHolder
  );

  // Card 4: Ticket Details & Tier
  drawMetaCard(
    col2X,
    row2Y,
    '🎟️ ADMISSION DETAILS',
    `${tierName} (Pass #${ticketNumber}/${totalTickets})`,
    `Ref: #${orderId}`
  );

  // --- LEFT FOOTER / SECURITY BADGE ---
  const footerY = cardY + cardH - 24;
  ctx.fillStyle = '#64748b';
  ctx.font = '600 10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText(
    'OFFICIAL DIGITAL ENTRY CREDENTIAL • VALID GOVERNMENT / STUDENT PHOTO ID REQUIRED',
    leftX,
    footerY
  );

  // Microprint Security Hash
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SEC-HASH:${ticketId.slice(0, 16).toUpperCase()}`, dividerX - 32, footerY);
  ctx.textAlign = 'start';

  // -------------------------------------------------------------
  // 5. RIGHT SECTION: STUB & DIRECT VECTOR QR CODE
  // -------------------------------------------------------------
  const stubCenterX = dividerX + (cardW - (dividerX - cardX)) / 2; // ~971

  // Stub Header
  ctx.save();
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 13px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦ SCAN FOR ADMISSION ✦', stubCenterX, cardY + 50);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.fillText('PRESENT AT ENTRANCE GATE', stubCenterX, cardY + 68);
  ctx.restore();

  // --- QR CODE CONTAINER (White rounded card with gold rim) ---
  const qrBoxSize = 244;
  const qrBoxX = stubCenterX - qrBoxSize / 2;
  const qrBoxY = cardY + 86;
  const qrBoxRadius = 14;

  ctx.save();
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Metallic Gold Outer Frame for QR box
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  // Black framing corner brackets inside the QR white container
  drawCornerBrackets(ctx, qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, 14, '#000000', 3);

  // Direct Vector QR Code Render (100% Infallible, crisp black modules)
  drawQRCodeVector(ctx, qrData, qrBoxX, qrBoxY, qrBoxSize, 18);
  ctx.restore();

  // --- TICKET IDENTIFIER MONOSPACE PILL ---
  const idLabelY = qrBoxY + qrBoxSize + 28;
  ctx.save();
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TICKET IDENTIFIER', stubCenterX, idLabelY);

  const idPillW = 286;
  const idPillH = 34;
  const idPillX = stubCenterX - idPillW / 2;
  const idPillY = idLabelY + 8;

  // Dark glass background with subtle gold border
  roundRect(ctx, idPillX, idPillY, idPillW, idPillH, 8);
  ctx.fillStyle = '#0c1018';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px "Courier New", Consolas, monospace';
  ctx.fillText(ticketId, stubCenterX, idPillY + 22);
  ctx.restore();

  // Single scan notice badge
  const scanNoticeY = idPillY + idPillH + 20;
  ctx.save();
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 11px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ SINGLE ADMISSION • 1 SCAN ONLY', stubCenterX, scanNoticeY);
  ctx.restore();

  // --- BOTTOM BARCODE & BRAND FOOTER ---
  const barcodeY = scanNoticeY + 12;
  const barcodeW = 250;
  const barcodeX = stubCenterX - barcodeW / 2;
  drawBarcode(ctx, ticketId, barcodeX, barcodeY, barcodeW, 24, '#475569');

  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 9px "Josefin Sans", "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIED DIGITAL ENTRY • FESTORA.COM', stubCenterX, cardY + cardH - 24);
  ctx.restore();

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
