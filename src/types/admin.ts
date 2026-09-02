/**
 * Shared types for admin event request handling
 */

export interface VenueAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface OnlineDetails {
  platform?: string;
  link?: string;
}

export interface TicketTier {
  name?: string;
  category?: string;
  description?: string;
  price: number;
  capacity?: number;
}

export interface EventRequirements {
  minimumAge?: number;
  prerequisites?: string[];
}

export interface EventRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  requesterId: string;
  eventDetails: {
    title: string;
    subtitle?: string;
    organizationName: string;
    organizationDescription: string;
    organizerContact: {
      email: string;
      phone: string;
      website?: string;
    };
    eventType: string;
    categories: string[];
    tags: string[];
    dateTime: {
      startDate: string;
      endDate: string;
      timezone: string;
    };
    venue: {
      name: string;
      address?: string | VenueAddress;
      onlineDetails?: OnlineDetails;
    };
    capacity: {
      total: number;
      estimatedAttendees: number;
    };
    pricing: {
      isFree: boolean;
      tiers: TicketTier[];
    };
    media: {
      coverImageUrl?: string;
    };
    description: string;
    shortDescription: string;
    requirements?: EventRequirements;
  };
  adminReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    approvalNotes?: string;
    changeRequests?: string[];
  };
  submittedAt: string;
  lastUpdatedAt: string;
  approvedAt?: string;
  eventId?: string;
}
