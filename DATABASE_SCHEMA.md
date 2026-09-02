# Festora Database Schema Documentation

## Overview
Festora is an event discovery and ticketing platform where users can browse and join events. When users want to create events, they submit requests that require admin approval before going live. This ensures quality control and content moderation.

## Correct App Flow Understanding

### 🎯 How Festora Actually Works:
1. **Single User Type**: All users sign up as participants/attendees
2. **Event Discovery**: Users browse approved, live events
3. **Join Events**: Users can purchase tickets and join events
4. **Event Creation Request**: Users can submit requests to create events
5. **Admin Moderation**: Admins review and approve/reject event requests
6. **Event Goes Live**: Only approved events appear publicly

---

## Database Schema

### 1. Users Collection (`users`)
**All users are participants - no separate organizer accounts**

```json
{
  "uid": "firebase_auth_uid", // Primary key from Firebase Auth
  "displayName": "John Doe",
  "email": "john@example.com",
  "avatar": "https://storage.url/avatar.jpg",
  "bio": "Tech enthusiast and event lover",
  "location": {
    "city": "New York",
    "country": "USA",
    "timezone": "America/New_York"
  },
  "preferences": {
    "categories": ["Technology", "Business", "Networking"],
    "notifications": {
      "email": true,
      "push": true,
      "eventReminders": true,
      "newEvents": false
    }
  },
  "stats": {
    "eventsAttended": 12,
    "eventsRequested": 3, // Events they requested to create
    "eventsApproved": 2,   // Their approved events
    "ticketsPurchased": 15
  },
  "createdAt": "2025-09-19T10:00:00Z",
  "updatedAt": "2025-09-19T10:00:00Z",
  "lastActiveAt": "2025-09-19T15:30:00Z"
}
```

### 2. Event Requests Collection (`event_requests`)
**User-submitted requests for creating events - awaiting admin approval**

```json
{
  "id": "request_uuid",
  "requesterId": "firebase_uid", // User who submitted the request
  "status": "pending", // pending, approved, rejected, changes_requested
  
  // Event Details (as submitted by user)
  "eventDetails": {
    "title": "Tech Talk: AI in Healthcare",
    "subtitle": "Exploring the future of AI applications",
    "description": "Full markdown description...",
    "shortDescription": "Brief summary for cards...",
    
    "organizationName": "Tech Club IIT", // User specifies their organization
    "organizationDescription": "Student tech community at IIT Delhi",
    "organizerContact": {
      "email": "contact@techclub.iit.ac.in",
      "phone": "+91-9876543210",
      "website": "https://techclub.iit.ac.in"
    },
    
    "eventType": "in-person", // in-person, online, hybrid
    "categories": ["Technology", "Healthcare"],
    "tags": ["AI", "Machine Learning", "Healthcare"],
    
    "dateTime": {
      "startDate": "2025-10-15T18:00:00Z",
      "endDate": "2025-10-15T20:00:00Z",
      "timezone": "Asia/Kolkata"
    },
    
    "venue": {
      "name": "Auditorium Hall, IIT Delhi",
      "address": {
        "street": "Hauz Khas",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "postalCode": "110016"
      },
      "onlineDetails": {
        "platform": "Zoom",
        "estimatedLink": "Will be provided before event"
      }
    },

    // PRICING INFORMATION (NEW)
    "ticketPrice": 500, // Price per ticket in INR (0 for free events)
    "totalTickets": 100, // Maximum capacity
    "isPaid": true, // true if ticketPrice > 0
    "earlyBirdPrice": 400, // Optional early bird pricing
    "earlyBirdDeadline": "2025-10-01T00:00:00Z"
  },
  
  // Admin Review Process
  "adminReview": {
    "reviewedBy": "admin_uid", // Admin who reviewed
    "reviewedAt": "2025-09-20T10:00:00Z",
    "reviewNotes": "Great event idea, please provide more details about speakers",
    "changeRequests": [
      "Add speaker information",
      "Specify exact venue capacity",
      "Provide backup plan for technical issues"
    ],
    "approvalNotes": "Approved - excellent educational content"
  },
  
  // Request Metadata
  "submittedAt": "2025-09-19T14:00:00Z",
  "lastUpdatedAt": "2025-09-20T10:00:00Z",
  "approvedAt": "2025-09-20T10:00:00Z", // null if not approved
  "eventId": "event_uuid" // Set when approved and event is created
}
```

### 3. Events Collection (`events`)
**Approved and live events that users can discover and join**

```json
{
  "id": "event_uuid",
  "title": "Tech Talk: AI in Healthcare",
  "subtitle": "Exploring the future of AI applications", 
  "description": "Full markdown description of the event...",
  "shortDescription": "Brief description for event cards and previews",
  
  // Organizer Information
  "organizationName": "Tech Club IIT",
  "organizationDescription": "Student tech community promoting innovation",
  "organizerContact": {
    "email": "contact@techclub.iit.ac.in",
    "phone": "+91-9876543210",
    "website": "https://techclub.iit.ac.in"
  },
  "createdBy": "firebase_uid", // User who requested this event
  "approvedBy": "admin_firebase_uid", // Admin who approved it
  
  // Event Classification
  "eventType": "in-person", // in-person, online, hybrid
  "categories": ["Technology", "Healthcare"],
  "tags": ["AI", "Machine Learning", "Healthcare", "Innovation"],
  
  // Date and Time
  "dateTime": {
    "startDate": "2025-10-15T18:00:00Z",
    "endDate": "2025-10-15T20:00:00Z",
    "timezone": "Asia/Kolkata",
    "duration": 120 // minutes
  },
  
  // Location Details
  "venue": {
    "name": "Main Auditorium, IIT Delhi",
    "address": {
      "street": "Hauz Khas",
      "city": "New Delhi", 
      "state": "Delhi",
      "country": "India",
      "postalCode": "110016",
      "coordinates": {
        "latitude": 28.5458,
        "longitude": 77.1931
      }
    },
    "onlineDetails": {
      "platform": "Zoom",
      "link": "https://zoom.us/j/1234567890", // Added after approval
      "meetingId": "123 456 7890",
      "passcode": "healthtech"
    }
  },

  // PRICING AND TICKETING (NEW)
  "ticketPrice": 500, // Price per ticket in INR
  "totalTickets": 100, // Maximum capacity
  "ticketsSold": 23, // Current number of sold tickets
  "isPaid": true, // true if ticketPrice > 0
  "earlyBirdPrice": 400, // Optional early bird pricing
  "earlyBirdDeadline": "2025-10-01T00:00:00Z",
  "salesStartDate": "2025-09-20T00:00:00Z", // When ticket sales begin
  "salesEndDate": "2025-10-15T12:00:00Z", // When ticket sales end
  
  // Revenue Tracking
  "totalRevenue": 11500, // Total amount collected (ticketsSold * ticketPrice)
  "platformFee": 345, // 3% platform fee
  "organizerRevenue": 11155, // Amount going to organizer
  
  // Status and Timestamps
  "status": "live", // live, sold_out, cancelled, completed
  "approvalStatus": "approved",
  "createdAt": "2025-09-19T10:00:00Z",
  "updatedAt": "2025-09-19T15:30:00Z",
  "approvedAt": "2025-09-19T14:20:00Z"
}
```

### 4. Orders Collection (`orders`) - NEW
**Payment transactions and order details**

```json
{
  "id": "order_1726834567_a1b2c3d4", // Unique order ID
  "userId": "firebase_uid", // Buyer's user ID
  "eventId": "event_uuid", // Event being purchased
  "quantity": 2, // Number of tickets purchased
  "ticketPrice": 500, // Price per ticket at time of purchase
  "totalAmount": 1000, // Total transaction amount
  
  // Payment Gateway Details
  "paymentGatewayId": "cashfree_order_id", // Cashfree order ID
  "cashfreeOrderToken": "order_token_from_cashfree",
  "cashfreePaymentId": "payment_id_after_success", // Set after payment
  
  // Order Status
  "status": "completed", // pending, completed, failed, refunded
  "createdAt": "2025-09-20T10:15:00Z",
  "paymentCompletedAt": "2025-09-20T10:16:23Z",
  "failedAt": null,
  "failureReason": null,
  
  // Event Details (snapshot for reference)
  "eventTitle": "Tech Talk: AI in Healthcare",
  "eventDate": "2025-10-15T18:00:00Z",
  "organizationName": "Tech Club IIT",
  
  // Additional Metadata
  "platformFee": 30, // 3% of totalAmount
  "organizerAmount": 970, // Amount going to organizer
  "refundAmount": 0, // If partially refunded
  "refundReason": null
}
```

### 5. Tickets Collection (`tickets`) - NEW
**Individual tickets generated after successful payment**

```json
{
  "id": "ticket_order_1726834567_a1b2c3d4_1", // Unique ticket ID
  "ticketId": "ticket_order_1726834567_a1b2c3d4_1", // Same as document ID
  "orderId": "order_1726834567_a1b2c3d4", // Reference to order
  "eventId": "event_uuid", // Event this ticket is for
  "userId": "firebase_uid", // Ticket holder's user ID
  
  // QR Code and Check-in
  "qrCodeData": "ticket_order_1726834567_a1b2c3d4_1", // Data embedded in QR code
  "isCheckedIn": false, // Check-in status
  "checkedInAt": null, // Timestamp when checked in
  "checkedInBy": null, // Staff member who checked in the ticket
  
  // Ticket Details
  "ticketNumber": 1, // Ticket number (1, 2, 3... for multiple tickets in same order)
  "totalTickets": 2, // Total tickets in the same order
  "seatNumber": null, // For events with assigned seating
  "section": null, // For events with sections
  
  // Timestamps
  "createdAt": "2025-09-20T10:16:23Z",
  "updatedAt": "2025-09-20T10:16:23Z",
  
  // Ticket Validation
  "isValid": true, // Can be set to false if ticket is cancelled
  "cancelledAt": null,
  "cancellationReason": null,
  
  // Event Details (snapshot for quick access)
  "eventTitle": "Tech Talk: AI in Healthcare",
  "eventDate": "2025-10-15T18:00:00Z",
  "venueName": "Main Auditorium, IIT Delhi"
}
```

### 6. Ticket Analytics Collection (`ticket_analytics`) - NEW
**Daily/event-level analytics for ticket sales**

```json
{
  "id": "analytics_event_uuid_2025-09-20", // event_id + date
  "eventId": "event_uuid",
  "date": "2025-09-20",
  
  // Daily Sales Metrics
  "ticketsSoldToday": 5,
  "revenueToday": 2500,
  "ordersToday": 3,
  "averageOrderValue": 833.33,
  
  // Cumulative Metrics
  "totalTicketsSold": 23,
  "totalRevenue": 11500,
  "totalOrders": 15,
  
  // Check-in Metrics (on event day)
  "totalCheckedIn": 18,
  "checkInRate": 78.26, // percentage
  "noShowCount": 5,
  
  // Hourly Breakdown
  "salesByHour": {
    "09": { "tickets": 2, "revenue": 1000, "orders": 1 },
    "14": { "tickets": 3, "revenue": 1500, "orders": 2 }
  },
  
  "updatedAt": "2025-09-20T23:59:59Z"
}
```

## Database Indexes (Updated)

### Required Firestore Indexes:

1. **events collection:**
   - `status` (ascending) + `dateTime.startDate` (ascending)
   - `categories` (array) + `dateTime.startDate` (ascending)
   - `createdBy` (ascending) + `createdAt` (descending)
   - `ticketsSold` (ascending) + `totalTickets` (ascending) // For availability queries

2. **orders collection:**
   - `userId` (ascending) + `createdAt` (descending)
   - `eventId` (ascending) + `status` (ascending)
   - `status` (ascending) + `createdAt` (descending)
   - `createdAt` (ascending) // For analytics queries

3. **tickets collection:**
   - `userId` (ascending) + `createdAt` (descending)
   - `eventId` (ascending) + `isCheckedIn` (ascending)
   - `orderId` (ascending)
   - `eventId` (ascending) + `createdAt` (ascending)

4. **event_requests collection:**
   - `requesterId` (ascending) + `createdAt` (descending)
   - `status` (ascending) + `createdAt` (descending)

5. **ticket_analytics collection:**
   - `eventId` (ascending) + `date` (descending)

## Security Rules (Updated)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Event requests - users can create and read their own
    match /event_requests/{requestId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && 
        (resource.data.requesterId == request.auth.uid || isAdmin());
      allow list: if isAdmin();
    }
    
    // Events - public read, admin write
    match /events/{eventId} {
      allow read: if true; // Public events
      allow write: if isAdmin();
    }
    
    // Orders - users can read their own orders
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write orders
    }
    
    // Tickets - users can read their own tickets
    match /tickets/{ticketId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write tickets
    }
    
    // Ticket Analytics - only admins and event creators
    match /ticket_analytics/{analyticsId} {
      allow read: if request.auth != null && 
        (isAdmin() || isEventCreator(resource.data.eventId));
      allow write: if false; // Only Cloud Functions can write analytics
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Helper function to check if user created the event
    function isEventCreator(eventId) {
      return request.auth != null && 
        get(/databases/$(database)/documents/events/$(eventId)).data.createdBy == request.auth.uid;
    }
  }
}
```

## Payment Flow Summary

### 1. User Journey:
1. User browses events and finds one they want to attend
2. Clicks "Buy Tickets" on event detail page
3. Selects quantity and clicks "Proceed to Pay"
4. Frontend calls `createPaymentOrder` Cloud Function
5. Cashfree payment popup/redirect opens
6. User completes payment on Cashfree
7. Cashfree sends webhook to `verifyPaymentWebhook`
8. Cloud Function processes payment, creates tickets, sends email
9. User receives tickets via email with QR codes

### 2. Security Measures:
- All pricing logic handled server-side
- Payment verification through Cashfree webhooks
- Signature verification for webhook authenticity  
- Firestore transactions for data consistency
- QR codes contain unique, non-guessable ticket IDs

### 3. Revenue Model:
- Platform takes 3% fee from each transaction
- Remaining 97% goes to event organizer
- Free events have no fees

This comprehensive database schema supports the complete ticketing and payment workflow while maintaining security and scalability.
