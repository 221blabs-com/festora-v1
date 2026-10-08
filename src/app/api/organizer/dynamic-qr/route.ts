import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import {
  getDynamicQrStats,
  listDynamicQrPasses,
  generateDynamicQrsForExistingParticipants,
  sendDynamicQrEmails
} from '@/lib/dynamic-qr-service';
import type { DynamicRegistrationField, Event } from '@/types/event';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const fieldId = searchParams.get('fieldId');

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
    }

    const [stats, passes] = await Promise.all([
      getDynamicQrStats(eventId),
      listDynamicQrPasses(eventId, fieldId || undefined)
    ]);

    return NextResponse.json({
      success: true,
      stats,
      passes
    });
  } catch (error: any) {
    console.error('Error fetching dynamic QR data:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, eventId, fieldId, passId, fieldConfig } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
    }

    if (action === 'generate_existing') {
      if (!fieldId) {
        return NextResponse.json({ success: false, error: 'Field ID is required' }, { status: 400 });
      }
      const result = await generateDynamicQrsForExistingParticipants(eventId, fieldId);
      return NextResponse.json(result);
    }

    if (action === 'send_emails') {
      const result = await sendDynamicQrEmails(eventId, fieldId, passId);
      return NextResponse.json(result);
    }

    if (action === 'create_field') {
      if (!fieldConfig || !fieldConfig.label) {
        return NextResponse.json({ success: false, error: 'Field configuration is required' }, { status: 400 });
      }

      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();
      if (!eventDoc.exists) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
      }
      const eventData = eventDoc.data() as Event;

      const currentFields = (eventData.registrationFields?.fields || []) as DynamicRegistrationField[];
      const newFieldId = fieldConfig.id || `field_dqr_${Date.now()}`;

      const newField: DynamicRegistrationField = {
        id: newFieldId,
        label: fieldConfig.label.trim(), // e.g. "Food Coupon"
        type: 'dynamic_qr',
        field_type: 'dynamic_qr',
        required: false,
        showOnTicket: true,
        show_on_ticket: true,
        displayOrder: currentFields.length + 1,
        display_order: currentFields.length + 1,
        qrCodeName: fieldConfig.qrCodeName?.trim() || fieldConfig.label.trim(), // e.g. "Lunch Coupon"
        qrDescription: fieldConfig.qrDescription?.trim() || '',
        validDayNumber: fieldConfig.validDayNumber || 'all',
        autoGenerateNewRegistrations: fieldConfig.autoGenerateNewRegistrations !== false,
        enabled: true
      };

      const updatedFields = [...currentFields, newField];

      await eventRef.update({
        'registrationFields.fields': updatedFields,
        updatedAt: new Date().toISOString()
      });

      // If requested to also generate for existing participants immediately
      let generatedForExisting = 0;
      if (fieldConfig.generateForExisting) {
        const genResult = await generateDynamicQrsForExistingParticipants(eventId, newFieldId);
        generatedForExisting = genResult.generatedCount;
      }

      return NextResponse.json({
        success: true,
        field: newField,
        generatedForExisting,
        message: `Dynamic QR Field "${newField.label}" created successfully`
      });
    }

    if (action === 'toggle_field') {
      if (!fieldId) {
        return NextResponse.json({ success: false, error: 'Field ID is required' }, { status: 400 });
      }

      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();
      if (!eventDoc.exists) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
      }
      const eventData = eventDoc.data() as Event;

      const currentFields = (eventData.registrationFields?.fields || []) as DynamicRegistrationField[];
      const updatedFields = currentFields.map(f =>
        f.id === fieldId ? { ...f, enabled: !f.enabled } : f
      );

      await eventRef.update({
        'registrationFields.fields': updatedFields,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: 'Field updated successfully' });
    }

    if (action === 'delete_field') {
      if (!fieldId) {
        return NextResponse.json({ success: false, error: 'Field ID is required' }, { status: 400 });
      }

      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();
      if (!eventDoc.exists) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
      }
      const eventData = eventDoc.data() as Event;

      const currentFields = (eventData.registrationFields?.fields || []) as DynamicRegistrationField[];
      const updatedFields = currentFields.filter(f => f.id !== fieldId);

      await eventRef.update({
        'registrationFields.fields': updatedFields,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: 'Field deleted successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in dynamic QR organizer route:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
