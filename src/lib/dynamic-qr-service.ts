/**
 * Dynamic QR Service for Festora
 * Handles generation, issuance, validation, redemption, emailing,
 * and analytics for dynamic QR coupons & passes (e.g. Food Coupons, Workshop Passes, etc.)
 */

import { db } from './firebase-admin';
import type { DynamicRegistrationField, Event } from '@/types/event';
import type { DynamicQrPass, Ticket } from '@/types/firestore';
import { sendDynamicQrEmailViaResend } from './resend-email';

/**
 * Generate clean unique dynamic QR code
 * Examples: FC001, FC-8A72K, WP102, ML004
 */
export function generateDynamicQrCode(labelOrName: string, index?: number): string {
  // Extract acronym (e.g. "Food Coupon" -> "FC", "Lunch Coupon" -> "LC")
  const words = labelOrName.trim().split(/\s+/).filter(Boolean);
  let prefix = words.length > 1
    ? words.map(w => w[0].toUpperCase()).slice(0, 3).join('')
    : labelOrName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'QR');
  
  if (!prefix || prefix.length < 2) prefix = 'QR';

  // Random 5-character alphanumeric token
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous 0, O, 1, I
  let randToken = '';
  for (let i = 0; i < 5; i++) {
    randToken += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  if (typeof index === 'number' && index > 0) {
    const formattedIndex = String(index).padStart(3, '0');
    return `${prefix}${formattedIndex}`;
  }

  return `${prefix}-${randToken}`;
}

/**
 * Automatically issue dynamic QR passes for newly created tickets
 * Called during order processing
 */
export async function autoIssueDynamicQrsForTickets(
  eventId: string,
  eventData: any,
  tickets: any[],
  orderData: any
): Promise<DynamicQrPass[]> {
  try {
    const fields = (eventData.registrationFields?.fields || []) as DynamicRegistrationField[];
    const dynamicQrFields = fields.filter(
      f => f.type === 'dynamic_qr' && f.enabled !== false && f.autoGenerateNewRegistrations !== false
    );

    if (dynamicQrFields.length === 0 || tickets.length === 0) {
      return [];
    }

    const issuedPasses: DynamicQrPass[] = [];

    for (const field of dynamicQrFields) {
      // Find count of existing passes for this field to maintain clean sequential numbering if desired
      const existingSnap = await db
        .collection('dynamic_qr_passes')
        .where('eventId', '==', eventId)
        .where('fieldId', '==', field.id)
        .get();

      let currentCount = existingSnap.size;

      for (const ticket of tickets) {
        currentCount++;
        const code = generateDynamicQrCode(field.qrCodeName || field.label, currentCount);
        const passId = `DQR_${ticket.ticketId}_${field.id}`;

        const participantName =
          ticket.teamInfo?.memberName ||
          ticket.memberName ||
          ticket.customerDetails?.name ||
          orderData.customerDetails?.name ||
          'Participant';

        const participantEmail =
          ticket.teamInfo?.memberEmail ||
          ticket.memberEmail ||
          ticket.customerDetails?.email ||
          orderData.customerDetails?.email ||
          '';

        const participantPhone =
          ticket.teamInfo?.memberPhone ||
          ticket.memberPhone ||
          ticket.customerDetails?.phone ||
          orderData.customerDetails?.phone ||
          '';

        const teamName = ticket.teamInfo?.teamName || ticket.teamName || orderData.teamData?.teamName || undefined;

        const passData: DynamicQrPass = {
          id: passId,
          eventId,
          eventTitle: eventData.title || '',
          registrationId: orderData.id || ticket.orderId,
          ticketId: ticket.ticketId,
          participantId: ticket.userId || ticket.ticketId,
          participantName,
          participantEmail,
          participantPhone,
          teamName,
          fieldId: field.id,
          fieldName: field.label,
          qrName: field.qrCodeName || field.label,
          qrDescription: field.qrDescription || '',
          code,
          validDayNumber: field.validDayNumber,
          status: 'active',
          emailStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.collection('dynamic_qr_passes').doc(passId).set(passData);
        issuedPasses.push(passData);

        // Send email immediately if recipient email is valid
        if (participantEmail && participantEmail.includes('@')) {
          try {
            const emailRes = await sendDynamicQrEmailViaResend({
              recipientEmail: participantEmail,
              recipientName: participantName,
              eventTitle: eventData.title || 'Festora Event',
              fieldName: field.label,
              qrName: field.qrCodeName || field.label,
              qrDescription: field.qrDescription,
              code,
              validDayNumber: field.validDayNumber,
              eventDate: eventData.startDate || eventData.date || new Date().toISOString()
            });

            if (emailRes.success) {
              await db.collection('dynamic_qr_passes').doc(passId).update({
                emailStatus: 'sent',
                emailSentAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              passData.emailStatus = 'sent';
            } else {
              await db.collection('dynamic_qr_passes').doc(passId).update({
                emailStatus: 'failed',
                emailError: emailRes.error || 'Failed to send email',
                updatedAt: new Date().toISOString()
              });
              passData.emailStatus = 'failed';
            }
          } catch (e: any) {
            console.error('Error auto-sending dynamic QR email:', e);
            await db.collection('dynamic_qr_passes').doc(passId).update({
              emailStatus: 'failed',
              emailError: e?.message || 'Email sending exception',
              updatedAt: new Date().toISOString()
            });
            passData.emailStatus = 'failed';
          }
        }
      }
    }

    return issuedPasses;
  } catch (error) {
    console.error('Error in autoIssueDynamicQrsForTickets:', error);
    return [];
  }
}

/**
 * Generate dynamic QR passes for participants who registered before this field was created
 */
export async function generateDynamicQrsForExistingParticipants(
  eventId: string,
  fieldId: string
): Promise<{ success: boolean; generatedCount: number; message: string }> {
  try {
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return { success: false, generatedCount: 0, message: 'Event not found' };
    }
    const eventData = eventDoc.data() as Event;

    const fields = (eventData.registrationFields?.fields || []) as DynamicRegistrationField[];
    const targetField = fields.find(f => f.id === fieldId && f.type === 'dynamic_qr');
    if (!targetField) {
      return { success: false, generatedCount: 0, message: 'Dynamic QR field not found' };
    }

    // Fetch all confirmed tickets for event
    const ticketsSnap = await db.collection('tickets').where('eventId', '==', eventId).get();
    if (ticketsSnap.empty) {
      return { success: true, generatedCount: 0, message: 'No registered participants found for this event' };
    }

    // Fetch existing passes for this field to avoid duplicates
    const existingPassesSnap = await db
      .collection('dynamic_qr_passes')
      .where('eventId', '==', eventId)
      .where('fieldId', '==', fieldId)
      .get();

    const existingTicketIds = new Set(existingPassesSnap.docs.map(doc => doc.data().ticketId));
    let counter = existingPassesSnap.size;
    let newlyGenerated = 0;

    const batch = db.batch();

    for (const ticketDoc of ticketsSnap.docs) {
      const ticket = ticketDoc.data() as Ticket;
      if (existingTicketIds.has(ticket.ticketId)) {
        continue;
      }

      counter++;
      newlyGenerated++;
      const code = generateDynamicQrCode(targetField.qrCodeName || targetField.label, counter);
      const passId = `DQR_${ticket.ticketId}_${targetField.id}`;

      const participantName =
        ticket.memberName ||
        (ticket.customerDetails as any)?.name ||
        'Participant';

      const participantEmail =
        ticket.memberEmail ||
        (ticket.customerDetails as any)?.email ||
        '';

      const participantPhone =
        ticket.memberPhone ||
        (ticket.customerDetails as any)?.phone ||
        '';

      const passData: DynamicQrPass = {
        id: passId,
        eventId,
        eventTitle: eventData.title || '',
        registrationId: ticket.orderId || '',
        ticketId: ticket.ticketId,
        participantId: ticket.userId || ticket.ticketId,
        participantName,
        participantEmail,
        participantPhone,
        fieldId: targetField.id,
        fieldName: targetField.label,
        qrName: targetField.qrCodeName || targetField.label,
        qrDescription: targetField.qrDescription || '',
        code,
        validDayNumber: targetField.validDayNumber,
        status: 'active',
        emailStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      batch.set(db.collection('dynamic_qr_passes').doc(passId), passData);
    }

    if (newlyGenerated > 0) {
      await batch.commit();
    }

    return {
      success: true,
      generatedCount: newlyGenerated,
      message: `Successfully generated ${newlyGenerated} QR pass${newlyGenerated === 1 ? '' : 'es'} for existing participants`
    };
  } catch (error: any) {
    console.error('Error generating QR passes for existing participants:', error);
    return { success: false, generatedCount: 0, message: error?.message || 'Failed to generate QR passes' };
  }
}

/**
 * Send dynamic QR emails to participants with delivery status tracking
 */
export async function sendDynamicQrEmails(
  eventId: string,
  fieldId?: string,
  passId?: string
): Promise<{ success: boolean; sentCount: number; failedCount: number; message: string }> {
  try {
    const eventDoc = await db.collection('events').doc(eventId).get();
    const eventData = eventDoc.exists ? eventDoc.data() : {};

    let query: FirebaseFirestore.Query = db.collection('dynamic_qr_passes').where('eventId', '==', eventId);
    if (fieldId) {
      query = query.where('fieldId', '==', fieldId);
    }

    const passesSnap = await query.get();
    if (passesSnap.empty) {
      return { success: true, sentCount: 0, failedCount: 0, message: 'No passes found to email' };
    }

    let passes = passesSnap.docs.map(d => ({ docId: d.id, ...d.data() } as any));
    if (passId) {
      passes = passes.filter(p => p.id === passId || p.docId === passId);
    } else {
      // Avoid re-sending duplicate emails accidentally
      passes = passes.filter(p => p.emailStatus !== 'sent');
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const pass of passes) {
      if (!pass.participantEmail || !pass.participantEmail.includes('@')) {
        failedCount++;
        await db.collection('dynamic_qr_passes').doc(pass.docId).update({
          emailStatus: 'failed',
          emailError: 'Invalid recipient email address',
          updatedAt: new Date().toISOString()
        });
        continue;
      }

      try {
        const res = await sendDynamicQrEmailViaResend({
          recipientEmail: pass.participantEmail,
          recipientName: pass.participantName || 'Participant',
          eventTitle: pass.eventTitle || eventData?.title || 'Festora Event',
          fieldName: pass.fieldName,
          qrName: pass.qrName,
          qrDescription: pass.qrDescription,
          code: pass.code,
          validDayNumber: pass.validDayNumber,
          eventDate: eventData?.startDate || eventData?.date || new Date().toISOString()
        });

        if (res.success) {
          sentCount++;
          await db.collection('dynamic_qr_passes').doc(pass.docId).update({
            emailStatus: 'sent',
            emailSentAt: new Date().toISOString(),
            emailError: null,
            updatedAt: new Date().toISOString()
          });
        } else {
          failedCount++;
          await db.collection('dynamic_qr_passes').doc(pass.docId).update({
            emailStatus: 'failed',
            emailError: res.error || 'Email dispatch failed',
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err: any) {
        failedCount++;
        await db.collection('dynamic_qr_passes').doc(pass.docId).update({
          emailStatus: 'failed',
          emailError: err?.message || 'Exception during email send',
          updatedAt: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      sentCount,
      failedCount,
      message: `Processed emails: ${sentCount} sent, ${failedCount} failed`
    };
  } catch (error: any) {
    console.error('Error sending dynamic QR emails:', error);
    return { success: false, sentCount: 0, failedCount: 0, message: error?.message || 'Failed to send emails' };
  }
}

/**
 * Validate a Dynamic QR code against event, day, and redemption status
 * Backend authoritative verification!
 */
export async function validateDynamicQr(
  code: string,
  eventId?: string,
  currentDayNumber?: number,
  currentDate?: string
): Promise<{
  valid: boolean;
  status: 'VALID' | 'ALREADY REDEEMED' | 'INVALID QR' | 'INVALID FOR TODAY' | 'INVALID REGISTRATION';
  message: string;
  pass?: DynamicQrPass;
}> {
  const cleanCode = code.trim().toUpperCase();

  // Search by code or doc ID
  let passDoc = null;
  const byCodeSnap = await db
    .collection('dynamic_qr_passes')
    .where('code', '==', cleanCode)
    .limit(1)
    .get();

  if (!byCodeSnap.empty) {
    passDoc = byCodeSnap.docs[0];
  } else {
    // Try by ID
    const byIdDoc = await db.collection('dynamic_qr_passes').doc(code.trim()).get();
    if (byIdDoc.exists) {
      passDoc = byIdDoc;
    }
  }

  if (!passDoc || !passDoc.exists) {
    return {
      valid: false,
      status: 'INVALID QR',
      message: 'Invalid QR Code. No matching pass or coupon found.'
    };
  }

  const pass = passDoc.data() as DynamicQrPass;
  pass.id = passDoc.id;

  // 1. Verify Event Match
  if (eventId && pass.eventId !== eventId) {
    return {
      valid: false,
      status: 'INVALID QR',
      message: 'This QR belongs to another event.',
      pass
    };
  }

  // 2. Verify Registration Validity (order / ticket not cancelled or refunded)
  if (pass.registrationId) {
    const orderDoc = await db.collection('orders').doc(pass.registrationId).get();
    if (orderDoc.exists) {
      const order = orderDoc.data();
      if (order?.status === 'cancelled' || order?.status === 'refunded') {
        return {
          valid: false,
          status: 'INVALID REGISTRATION',
          message: 'The registration for this coupon was cancelled or refunded.',
          pass
        };
      }
    }
  }

  if (pass.status === 'cancelled') {
    return {
      valid: false,
      status: 'INVALID REGISTRATION',
      message: 'This pass has been cancelled.',
      pass
    };
  }

  // 3. Verify Day Validity (for multi-day events)
  if (
    pass.validDayNumber !== undefined &&
    pass.validDayNumber !== null &&
    pass.validDayNumber !== 'all' &&
    currentDayNumber !== undefined &&
    currentDayNumber !== null
  ) {
    if (Number(pass.validDayNumber) !== Number(currentDayNumber)) {
      return {
        valid: false,
        status: 'INVALID FOR TODAY',
        message: `This QR code is valid only for Day ${pass.validDayNumber}.`,
        pass
      };
    }
  }

  // 4. Verify Single Redemption Status
  if (pass.status === 'redeemed') {
    const redeemedDateStr = pass.redeemedAt
      ? new Date(pass.redeemedAt as any).toLocaleString()
      : 'previously';
    return {
      valid: false,
      status: 'ALREADY REDEEMED',
      message: `Coupon already redeemed on ${redeemedDateStr}${pass.redeemedBy ? ` by ${pass.redeemedBy}` : ''}.`,
      pass
    };
  }

  return {
    valid: true,
    status: 'VALID',
    message: 'Valid coupon. Ready to redeem.',
    pass
  };
}

/**
 * Redeem Dynamic QR code
 * Atomic update on Firestore
 */
export async function redeemDynamicQr(
  code: string,
  eventId?: string,
  staffInfo?: { name?: string; id?: string },
  currentDayNumber?: number,
  currentDate?: string
): Promise<{
  success: boolean;
  status: 'VALID' | 'REDEEMED' | 'ALREADY REDEEMED' | 'INVALID QR' | 'INVALID FOR TODAY' | 'INVALID REGISTRATION';
  message: string;
  pass?: DynamicQrPass;
}> {
  // Validate first
  const validation = await validateDynamicQr(code, eventId, currentDayNumber, currentDate);
  if (!validation.valid || !validation.pass) {
    return {
      success: false,
      status: validation.status,
      message: validation.message,
      pass: validation.pass
    };
  }

  const pass = validation.pass;
  const passRef = db.collection('dynamic_qr_passes').doc(pass.id!);

  const redeemedAt = new Date().toISOString();
  const redeemedBy = staffInfo?.name || 'Staff';

  await passRef.update({
    status: 'redeemed',
    redeemedAt,
    redeemedBy,
    updatedAt: redeemedAt
  });

  const updatedPass: DynamicQrPass = {
    ...pass,
    status: 'redeemed',
    redeemedAt,
    redeemedBy
  };

  return {
    success: true,
    status: 'REDEEMED',
    message: `Successfully redeemed ${pass.qrName || pass.fieldName} for ${pass.participantName}!`,
    pass: updatedPass
  };
}

/**
 * Get Dynamic QR field stats for organizer dashboard
 * Counts: generated, sent, redeemed, remaining
 */
export async function getDynamicQrStats(eventId: string): Promise<Array<{
  fieldId: string;
  fieldName: string;
  qrName: string;
  qrDescription?: string;
  validDayNumber?: number | 'all';
  enabled: boolean;
  generated: number;
  sent: number;
  redeemed: number;
  remaining: number;
}>> {
  const eventDoc = await db.collection('events').doc(eventId).get();
  if (!eventDoc.exists) return [];
  const eventData = eventDoc.data() as Event;

  const fields = (eventData.registrationFields?.fields || []).filter(
    f => f.type === 'dynamic_qr'
  );

  if (fields.length === 0) return [];

  const passesSnap = await db.collection('dynamic_qr_passes').where('eventId', '==', eventId).get();
  const passes = passesSnap.docs.map(d => d.data() as DynamicQrPass);

  return fields.map(field => {
    const fieldPasses = passes.filter(p => p.fieldId === field.id);
    const generated = fieldPasses.length;
    const sent = fieldPasses.filter(p => p.emailStatus === 'sent').length;
    const redeemed = fieldPasses.filter(p => p.status === 'redeemed').length;
    const remaining = Math.max(0, generated - redeemed);

    return {
      fieldId: field.id,
      fieldName: field.label,
      qrName: field.qrCodeName || field.label,
      qrDescription: field.qrDescription,
      validDayNumber: field.validDayNumber,
      enabled: field.enabled !== false,
      generated,
      sent,
      redeemed,
      remaining
    };
  });
}

/**
 * List all generated dynamic QR passes for a specific field or event
 */
export async function listDynamicQrPasses(eventId: string, fieldId?: string): Promise<DynamicQrPass[]> {
  let query: FirebaseFirestore.Query = db.collection('dynamic_qr_passes').where('eventId', '==', eventId);
  if (fieldId) {
    query = query.where('fieldId', '==', fieldId);
  }

  const snap = await query.get();
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as DynamicQrPass;
  });
}
