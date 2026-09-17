/**
 * Event Type Definitions
 * Based on AIGNITE template structure - used for template-based event creation
 */

export interface EventLocation {
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface EventOrganizer {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  verified?: boolean;
}

export interface EventOrganizerLinks {
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  discord?: string;
  github?: string;
}

export interface TeamSettings {
  minTeamSize?: number;
  maxTeamSize?: number;
  allowIndividual?: boolean;
}

export type PresetFieldKey = 'rollNumber' | 'college' | 'department' | 'year' | 'gender' | 'tshirtSize';

export interface PresetFieldConfig {
  key: PresetFieldKey;
  label: string;
  enabled: boolean;
  required: boolean;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface EventRegistrationFields {
  presets?: PresetFieldConfig[];
  customFields?: CustomFieldConfig[];
}

export interface AgendaItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

export interface EventDateTime {
  startDate: string;
  endDate?: string;
}

export type VenueType = 'physical' | 'virtual' | 'hybrid';

// Venue can be string or object depending on how data is stored
export interface VenueObject {
  name?: string;
  address?: string;
}
export type EventVenue = string | VenueObject;
export type EventStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type EventCategory =
  | 'Technology'
  | 'Business'
  | 'Arts & Culture'
  | 'Sports'
  | 'Education'
  | 'Entertainment'
  | 'Networking'
  | 'Workshop'
  | 'Conference'
  | 'Hackathon'
  | 'Competition'
  | 'Social'
  | 'Other';

export interface Event {
  // Core Identity
  id?: string;
  slug?: string;
  title: string;
  description: string;
  shortDescription?: string;
  image: string;

  // Date & Time
  startDate: string;
  endDate: string;
  dateTime?: EventDateTime;

  // Venue - can be string or object in Firestore
  venue: EventVenue;
  venueType: VenueType;
  location: EventLocation;
  virtualLink?: string; // For virtual/hybrid events

  // Pricing
  price: number;
  originalPrice?: number;
  ticketPrice?: number;
  isPaid?: boolean;
  currency: string;

  // Category & Tags
  category: EventCategory | string;
  categories?: string[];
  tags: string[];
  badges?: string[];

  // Organizer
  organizer: EventOrganizer;
  organizationName?: string;
  organizationDescription?: string;
  organizerLinks?: EventOrganizerLinks;

  // Capacity & Registration
  capacity?: number; // Optional - if not set, unlimited
  totalTickets?: number; // Alias for capacity
  registeredCount?: number;
  ticketsSold?: number;

  // Team Settings (for hackathons, competitions)
  isTeamEvent?: boolean;
  teamSettings?: TeamSettings;

  // Participant Data Collection Fields
  registrationFields?: EventRegistrationFields;

  // Event Details
  agenda?: AgendaItem[];
  requirements?: string[];

  // Status & Visibility
  status: EventStatus | 'published' | 'active' | 'live';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  isPublished?: boolean;
  published?: boolean;
  featured?: boolean;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Event Template for quick creation
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultValues: Partial<Event>;
  suggestedBadges: string[];
  suggestedCategories: string[];
}

// Predefined templates
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'hackathon',
    name: 'Hackathon',
    description: 'Multi-day coding competition with team submissions',
    icon: '🚀',
    defaultValues: {
      category: 'Hackathon',
      categories: ['Technology', 'Hackathon', 'Competition'],
      isTeamEvent: true,
      teamSettings: {
        minTeamSize: 2,
        maxTeamSize: 4,
        allowIndividual: false
      },
      requirements: [
        'Laptop required',
        'Basic programming knowledge helpful'
      ],
      badges: ['Team Event', 'Competition']
    },
    suggestedBadges: ['Free', 'Team Event', 'Hackathon', 'Prizes'],
    suggestedCategories: ['Technology', 'AI', 'Hackathon', 'Competition']
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Hands-on learning session with practical exercises',
    icon: '🎓',
    defaultValues: {
      category: 'Workshop',
      categories: ['Education', 'Workshop'],
      isTeamEvent: false,
      requirements: [
        'Laptop recommended',
        'No prior experience needed'
      ],
      badges: ['Hands-on', 'Beginner Friendly']
    },
    suggestedBadges: ['Free', 'Hands-on', 'Beginner Friendly', 'Certificate'],
    suggestedCategories: ['Education', 'Technology', 'Workshop']
  },
  {
    id: 'conference',
    name: 'Conference',
    description: 'Large-scale event with multiple speakers and sessions',
    icon: '🎤',
    defaultValues: {
      category: 'Conference',
      categories: ['Conference', 'Networking'],
      isTeamEvent: false,
      requirements: [
        'Business cards recommended'
      ],
      badges: ['Networking', 'Industry Experts']
    },
    suggestedBadges: ['Early Bird', 'Limited Seats', 'Networking', 'Industry Experts'],
    suggestedCategories: ['Business', 'Technology', 'Conference', 'Networking']
  },
  {
    id: 'competition',
    name: 'Competition',
    description: 'Competitive event with prizes and rankings',
    icon: '🏆',
    defaultValues: {
      category: 'Competition',
      categories: ['Competition'],
      isTeamEvent: true,
      teamSettings: {
        minTeamSize: 1,
        maxTeamSize: 5,
        allowIndividual: true
      },
      badges: ['Competition', 'Prizes']
    },
    suggestedBadges: ['Free', 'Prizes', 'Competition', 'Team Event'],
    suggestedCategories: ['Competition', 'Technology', 'Business']
  },
  {
    id: 'networking',
    name: 'Networking Event',
    description: 'Social gathering for professionals to connect',
    icon: '🤝',
    defaultValues: {
      category: 'Networking',
      categories: ['Networking', 'Social'],
      isTeamEvent: false,
      requirements: [
        'Bring your business cards'
      ],
      badges: ['Networking', 'Social']
    },
    suggestedBadges: ['Free', 'Networking', 'Social', 'Open to All'],
    suggestedCategories: ['Networking', 'Business', 'Social']
  },
  {
    id: 'custom',
    name: 'Custom Event',
    description: 'Start from scratch with full customization',
    icon: '✨',
    defaultValues: {
      category: 'Other',
      categories: [],
      isTeamEvent: false,
      badges: []
    },
    suggestedBadges: ['Free', 'Popular', 'Limited Seats', 'Featured'],
    suggestedCategories: ['Technology', 'Business', 'Education', 'Entertainment']
  }
];

// Available badges
export const AVAILABLE_BADGES = [
  'Free',
  'Popular',
  'Featured',
  'Limited Seats',
  'Early Bird',
  'Team Event',
  'Hackathon',
  'Competition',
  'Prizes',
  'Certificate',
  'Networking',
  'Hands-on',
  'Beginner Friendly',
  'Advanced',
  'Industry Experts',
  'Virtual',
  'Hybrid',
  'Food Provided',
  'Swag',
  'Sponsored'
];

// Available categories
export const AVAILABLE_CATEGORIES = [
  'Technology',
  'Business',
  'Arts & Culture',
  'Sports',
  'Education',
  'Entertainment',
  'Networking',
  'Workshop',
  'Conference',
  'Hackathon',
  'Competition',
  'Social',
  'AI',
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Cybersecurity',
  'Blockchain',
  'Design',
  'Marketing',
  'Finance',
  'Health',
  'Environment',
  'Other'
];
