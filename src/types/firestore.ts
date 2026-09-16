/**
 * Firestore Document Types
 * Central type definitions for all Firestore collections
 */

import type { Timestamp } from 'firebase/firestore';

// Re-export existing types
export type { Event, EventLocation, EventOrganizer, EventOrganizerLinks, TeamSettings, AgendaItem, EventDateTime, VenueType, EventStatus, EventCategory } from './event';
export type { UserProfile, OnboardingStep } from './user';

// ============================================
// Order Types
// ============================================

export type OrderStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface TeamMember {
  name: string;
  email: string;
  phone?: string;
  rollNumber?: string;
  year?: string;
  school?: string;
  college?: string;
  department?: string;
}

export interface TeamData {
  teamName: string;
  members: TeamMember[];
  college?: string;
  department?: string;
}

export interface Order {
  id?: string;
  userId: string;
  eventId: string;
  quantity: number;
  ticketPrice: number;
  totalAmount: number;

  // Payment Gateway Details
  paymentGateway?: 'razorpay' | 'cashfree' | string;
  paymentGatewayId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  cashfreeOrderId?: string;
  cashfreeOrderToken?: string;
  cashfreePaymentId?: string;
  payment_session_id?: string;

  // Order Status
  status: OrderStatus;
  createdAt: string | Timestamp | Date;
  paymentCompletedAt?: string | Timestamp | Date;
  failedAt?: string | Timestamp | Date;
  failureReason?: string;

  // Event Details (snapshot)
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;

  // Team Registration
  isTeamRegistration?: boolean;
  teamData?: TeamData;

  // Fee Structure
  platformFee?: number;
  organizerAmount?: number;
  refundAmount?: number;
  refundReason?: string;

  // Purchaser Info
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  // Tier Info
  tierId?: string;
  tierName?: string;
}

// ============================================
// Ticket Types
// ============================================

export interface Ticket {
  id?: string;
  ticketId: string;
  orderId: string;
  eventId: string;
  // Null for a team-registration ticket whose member does not have an
  // account yet - claimed (set to their uid) once they sign up or log in.
  userId: string | null;
  claimEmail?: string;

  // Member Info (for team tickets)
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;

  // QR Code and Check-in
  qrCodeData?: string;
  isCheckedIn: boolean;
  checkedInAt?: string | Timestamp | Date;
  checkedInBy?: string;

  // Ticket Details
  ticketNumber?: number;
  totalTickets?: number;
  seatNumber?: string;
  section?: string;

  // Tier Info
  tierId?: string;
  tierName?: string;
  tierPrice?: number;

  // Timestamps
  createdAt: string | Timestamp | Date;
  updatedAt?: string | Timestamp | Date;

  // Validation
  isValid: boolean;
  cancelledAt?: string | Timestamp | Date;
  cancellationReason?: string;

  // Event Details (snapshot)
  eventTitle?: string;
  eventDate?: string;
  venueName?: string;
}

// ============================================
// Event Request Types
// ============================================

export type EventRequestStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface Address {
  street?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface OnlineDetails {
  platform?: string;
  link?: string;
  meetingId?: string;
  passcode?: string;
}

export interface Venue {
  name: string;
  address: Address;
  onlineDetails?: OnlineDetails;
}

export interface TicketTier {
  id?: string;
  name: string;
  price: number;
  capacity: number;
  description?: string;
  benefits?: string[];
  soldCount?: number;
}

export interface PricingInfo {
  isPaid: boolean;
  currency: string;
  tiers: TicketTier[];
}

export interface OrganizerContact {
  email: string;
  phone?: string;
  website?: string;
}

export interface EventRequestDetails {
  title: string;
  subtitle?: string;
  description: string;
  shortDescription?: string;

  organizationName: string;
  organizationDescription?: string;
  organizerContact?: OrganizerContact;

  eventType: 'in-person' | 'online' | 'hybrid';
  categories: string[];
  tags?: string[];

  dateTime: {
    startDate: string;
    endDate: string;
    timezone?: string;
  };

  venue: Venue;
  pricing: PricingInfo;

  // Media
  coverImage?: string;
  galleryImages?: string[];

  // Additional
  agenda?: Array<{ time: string; title: string; description?: string }>;
  requirements?: string[] | Record<string, boolean>;

  // Team Settings
  isTeamEvent?: boolean;
  teamSettings?: {
    minTeamSize: number;
    maxTeamSize: number;
    allowIndividual: boolean;
  };
}

export interface AdminReview {
  reviewedBy?: string;
  reviewedAt?: string | Timestamp | Date;
  reviewNotes?: string;
  changeRequests?: string[];
  approvalNotes?: string;
}

export interface EventRequest {
  id?: string;
  requesterId: string;
  requesterEmail?: string;
  requesterName?: string;

  status: EventRequestStatus;
  eventDetails: EventRequestDetails;

  adminReview?: AdminReview;

  // Timestamps
  submittedAt: string | Timestamp | Date;
  lastUpdatedAt?: string | Timestamp | Date;
  approvedAt?: string | Timestamp | Date;
  rejectedAt?: string | Timestamp | Date;

  // Reference to created event
  eventId?: string;
}

// ============================================
// Ticket Analytics Types
// ============================================

export interface HourlySales {
  tickets: number;
  revenue: number;
  orders: number;
}

export interface TicketAnalytics {
  id?: string;
  eventId: string;
  date: string;

  // Daily Metrics
  ticketsSoldToday: number;
  revenueToday: number;
  ordersToday: number;
  averageOrderValue: number;

  // Cumulative Metrics
  totalTicketsSold: number;
  totalRevenue: number;
  totalOrders: number;

  // Check-in Metrics
  totalCheckedIn?: number;
  checkInRate?: number;
  noShowCount?: number;

  // Hourly Breakdown
  salesByHour?: Record<string, HourlySales>;

  updatedAt: string | Timestamp | Date;
}

// ============================================
// Cashfree Types
// ============================================

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_self' | '_blank' | '_modal' | '_top';
}

export interface CashfreeCheckoutResult {
  error?: {
    message: string;
    code?: string;
  };
  redirect?: boolean;
  paymentDetails?: {
    paymentMessage: string;
    paymentStatus: string;
  };
}

export interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}
