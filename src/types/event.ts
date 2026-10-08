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

export type DynamicFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'date'
  | 'dynamic_qr';

export interface DynamicRegistrationField {
  id: string;
  event_id?: string;
  label: string; // QR Field Name when type is dynamic_qr
  type: DynamicFieldType;
  field_type?: DynamicFieldType; // Alias for db compatibility
  required: boolean;
  options?: string[];
  displayOrder: number;
  display_order?: number; // Alias for db compatibility
  showOnTicket: boolean;
  show_on_ticket?: boolean; // Alias for db compatibility
  placeholder?: string;
  defaultValue?: string | string[];

  // Dynamic QR Specific Settings
  qrCodeName?: string; // e.g. "Lunch Coupon"
  qrDescription?: string; // e.g. "Meal coupon for registered participants"
  validDayNumber?: number | 'all'; // null or 'all' = entire event, 1 = Day 1 only, etc.
  autoGenerateNewRegistrations?: boolean; // Auto generate on new ticket purchases
  enabled?: boolean;
}

export interface DynamicFieldAnswer {
  id?: string;
  fieldId: string;
  field_id?: string;
  registration_id?: string;
  label: string;
  answer: string | string[];
  showOnTicket: boolean;
  show_on_ticket?: boolean;
  fieldType?: DynamicFieldType;
  field_type?: DynamicFieldType;
}

export interface EventRegistrationFields {
  presets?: PresetFieldConfig[];
  customFields?: CustomFieldConfig[];
  fields?: DynamicRegistrationField[];
}

export interface RegistrationFieldTemplate {
  key: string;
  label: string;
  type: DynamicFieldType;
  required: boolean;
  showOnTicket: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export const REGISTRATION_FIELD_TEMPLATES: RegistrationFieldTemplate[] = [
  {
    key: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    showOnTicket: true,
    placeholder: 'e.g. Pavan Kalyan',
    description: 'Attendee legal or badge name'
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    showOnTicket: true,
    placeholder: 'e.g. pavan@example.com',
    description: 'Ticket & event updates destination'
  },
  {
    key: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: true,
    showOnTicket: true,
    placeholder: 'e.g. +91 9876543210',
    description: 'Direct SMS / WhatsApp contact'
  },
  {
    key: 'tshirtSize',
    label: 'T-Shirt Size',
    type: 'dropdown',
    required: true,
    showOnTicket: true,
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    placeholder: 'Select size',
    description: 'For swag bags and event kits'
  },
  {
    key: 'foodPreference',
    label: 'Food Preference',
    type: 'dropdown',
    required: true,
    showOnTicket: true,
    options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain'],
    placeholder: 'Select preference',
    description: 'Catering and meal distribution'
  },
  {
    key: 'collegeCompany',
    label: 'College/Company',
    type: 'text',
    required: false,
    showOnTicket: true,
    placeholder: 'e.g. Harvard University / Google',
    description: 'Institution or organization affiliation'
  },
  {
    key: 'age',
    label: 'Age',
    type: 'number',
    required: false,
    showOnTicket: false,
    placeholder: 'e.g. 21',
    description: 'Demographics & eligibility verification'
  },
  {
    key: 'gender',
    label: 'Gender',
    type: 'dropdown',
    required: false,
    showOnTicket: false,
    options: ['Male', 'Female', 'Other', 'Prefer not to say'],
    placeholder: 'Select gender',
    description: 'Demographics tracking'
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    required: false,
    showOnTicket: false,
    placeholder: 'e.g. Hyderabad, Bengaluru',
    description: 'Attendee location / home city'
  },
  {
    key: 'emergencyContact',
    label: 'Emergency Contact',
    type: 'phone',
    required: false,
    showOnTicket: false,
    placeholder: 'e.g. +91 9123456789',
    description: 'Emergency guardian / friend contact'
  },
  {
    key: 'customQuestion',
    label: 'Custom Question',
    type: 'text',
    required: false,
    showOnTicket: false,
    placeholder: 'e.g. How did you hear about us?',
    description: 'Ask any specific question'
  }
];

/**
 * Normalizes an event's registration fields into a unified DynamicRegistrationField[]
 * with full backward compatibility for older presets and customFields.
 */
export function getEffectiveRegistrationFields(
  registrationFields?: EventRegistrationFields | null
): DynamicRegistrationField[] {
  if (!registrationFields) {
    return [
      {
        id: 'field_name',
        label: 'Full Name',
        type: 'text',
        required: true,
        displayOrder: 1,
        showOnTicket: true,
        placeholder: 'Enter full name'
      },
      {
        id: 'field_email',
        label: 'Email',
        type: 'email',
        required: true,
        displayOrder: 2,
        showOnTicket: true,
        placeholder: 'Enter email address'
      },
      {
        id: 'field_phone',
        label: 'Phone Number',
        type: 'phone',
        required: true,
        displayOrder: 3,
        showOnTicket: true,
        placeholder: 'Enter phone number'
      }
    ];
  }

  // If explicit new dynamic fields exist, return them sorted by displayOrder
  if (Array.isArray(registrationFields.fields) && registrationFields.fields.length > 0) {
    return [...registrationFields.fields]
      .map((f, idx) => ({
        ...f,
        type: f.type || f.field_type || 'text',
        displayOrder: typeof f.displayOrder === 'number' ? f.displayOrder : (typeof f.display_order === 'number' ? f.display_order : idx + 1),
        showOnTicket: f.showOnTicket ?? f.show_on_ticket ?? true
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // Backward compatibility: Convert legacy presets and customFields to dynamic fields
  const fields: DynamicRegistrationField[] = [
    {
      id: 'field_name',
      label: 'Full Name',
      type: 'text',
      required: true,
      displayOrder: 1,
      showOnTicket: true,
      placeholder: 'Enter full name'
    },
    {
      id: 'field_email',
      label: 'Email',
      type: 'email',
      required: true,
      displayOrder: 2,
      showOnTicket: true,
      placeholder: 'Enter email address'
    },
    {
      id: 'field_phone',
      label: 'Phone Number',
      type: 'phone',
      required: true,
      displayOrder: 3,
      showOnTicket: true,
      placeholder: 'Enter phone number'
    }
  ];

  let currentOrder = 4;

  if (Array.isArray(registrationFields.presets)) {
    for (const preset of registrationFields.presets) {
      if (!preset.enabled) continue;

      if (preset.key === 'rollNumber') {
        fields.push({
          id: 'field_rollNumber',
          label: preset.label || 'Roll Number / Student ID',
          type: 'text',
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: true,
          placeholder: 'Enter roll number'
        });
      } else if (preset.key === 'college') {
        fields.push({
          id: 'field_college',
          label: preset.label || 'College / University',
          type: 'text',
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: true,
          placeholder: 'Enter college name'
        });
      } else if (preset.key === 'department') {
        fields.push({
          id: 'field_department',
          label: preset.label || 'Department / Branch',
          type: 'text',
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: true,
          placeholder: 'Enter department'
        });
      } else if (preset.key === 'year') {
        fields.push({
          id: 'field_year',
          label: preset.label || 'Year of Study',
          type: 'dropdown',
          options: ['1st', '2nd', '3rd', '4th'],
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: true
        });
      } else if (preset.key === 'gender') {
        fields.push({
          id: 'field_gender',
          label: preset.label || 'Gender',
          type: 'dropdown',
          options: ['Male', 'Female', 'Other', 'Prefer not to say'],
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: false
        });
      } else if (preset.key === 'tshirtSize') {
        fields.push({
          id: 'field_tshirtSize',
          label: preset.label || 'T-Shirt Size',
          type: 'dropdown',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          required: preset.required,
          displayOrder: currentOrder++,
          showOnTicket: true
        });
      }
    }
  } else if (registrationFields.presets && typeof registrationFields.presets === 'object') {
    const pObj = registrationFields.presets as Record<string, any>;
    if (pObj.requireCollege || pObj.college) {
      fields.push({
        id: 'field_college',
        label: 'College / University',
        type: 'text',
        required: true,
        displayOrder: currentOrder++,
        showOnTicket: true,
      });
    }
    if (pObj.requireTshirt || pObj.tshirtSize) {
      fields.push({
        id: 'field_tshirtSize',
        label: 'T-Shirt Size',
        type: 'dropdown',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        required: true,
        displayOrder: currentOrder++,
        showOnTicket: true,
      });
    }
  }

  if (Array.isArray(registrationFields.customFields)) {
    for (const cf of registrationFields.customFields) {
      fields.push({
        id: cf.id,
        label: cf.label,
        type: cf.type === 'select' ? 'dropdown' : cf.type,
        options: cf.options,
        required: cf.required,
        displayOrder: currentOrder++,
        showOnTicket: true,
        placeholder: cf.placeholder
      });
    }
  }

  return fields;
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

export interface EventDay {
  dayNumber: number; // 1, 2, 3...
  date: string; // ISO format or YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  title?: string;
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
  isMultiDay?: boolean;
  eventDays?: EventDay[];

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
