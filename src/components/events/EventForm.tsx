'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Plus,
  Trash2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import {

  Event,
  AgendaItem,
  AVAILABLE_BADGES,
  AVAILABLE_CATEGORIES
} from '@/types/event';
interface EventFormProps {
  initialData?: Partial<Event>;
  editMode?: boolean;
  eventId?: string;
  isOrganizer?: boolean;
}

export default function EventForm({
  initialData,
  editMode = false,
  eventId,
  isOrganizer = false
}: EventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdEventSlug, setCreatedEventSlug] = useState('');
  const [organizerCredentials, setOrganizerCredentials] = useState<{ username: string; password: string } | null>(null);
  
  const [organizersList, setOrganizersList] = useState<any[]>([]);
  const [useExistingOrganizer, setUseExistingOrganizer] = useState(false);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState('');

  useEffect(() => {
    // Fetch organizers on mount
    fetch('/api/admin/list-organizers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.organizers) {
          setOrganizersList(data.organizers);
        }
      })
      .catch(err => console.error('Error fetching organizers:', err));
  }, []);

  const [formData, setFormData] = useState<Partial<Event>>(initialData || {
    title: '',
    description: '',
    shortDescription: '',
    image: '',
    startDate: '',
    endDate: '',
    venue: '',
    venueType: 'physical',
    location: {
      address: '',
      city: '',
      state: '',
      country: ''
    },
    virtualLink: '',
    price: 0,
    originalPrice: 0,
    currency: 'USD',
    category: 'Other',
    categories: [],
    tags: [],
    badges: [],
    organizer: {
      id: '',
      name: '',
      email: '',
      avatar: ''
    },
    organizationName: '',
    organizationDescription: '',
    organizerLinks: {
      website: '',
      instagram: '',
      linkedin: '',
      twitter: '',
      youtube: '',
      discord: '',
      github: ''
    },
    capacity: undefined,
    isTeamEvent: false,
    teamSettings: {
      minTeamSize: 1,
      maxTeamSize: 4,
      allowIndividual: true
    },
    agenda: [],
    requirements: [],
    status: 'published',
    approvalStatus: 'approved',
    featured: false
  });

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      const [parent, child] = keys;
      const parentValue = prev[parent as keyof typeof prev];
      return {
        ...prev,
        [parent]: {
          ...(typeof parentValue === 'object' && parentValue !== null ? parentValue : {}),
          [child]: value
        }
      };
    });
  };

  const addAgendaItem = () => {
    setFormData((prev) => ({
      ...prev,
      agenda: [...(prev.agenda || []), { time: '', title: '', description: '' }]
    }));
  };

  const updateAgendaItem = (index: number, field: keyof AgendaItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda?.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda?.filter((_, i) => i !== index)
    }));
  };

  const addRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), '']
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements?.map((item, i) => (i === index ? value : item))
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index)
    }));
  };

  const toggleBadge = (badge: string) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges?.includes(badge)
        ? prev.badges?.filter((b) => b !== badge)
        : [...(prev.badges || []), badge]
    }));
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories?.filter((c) => c !== category)
        : [...(prev.categories || []), category]
    }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags?.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag)
    }));
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setCreatedEventSlug('');
    setOrganizerCredentials(null);
    setFormData({
      title: '', description: '', shortDescription: '', image: '', startDate: '', endDate: '',
      venue: '', venueType: 'physical', location: { address: '', city: '', state: '', country: '' },
      virtualLink: '', price: 0, originalPrice: 0, currency: 'USD',
      category: 'Other', categories: [], tags: [], badges: [],
      organizer: { id: '', name: '', email: '', avatar: '' }, organizationName: '', organizationDescription: '',
      organizerLinks: { website: '', instagram: '', linkedin: '', twitter: '', youtube: '', discord: '', github: '' },
      capacity: undefined, isTeamEvent: false, teamSettings: { minTeamSize: 1, maxTeamSize: 4, allowIndividual: true },
      agenda: [], requirements: [], status: 'published', approvalStatus: 'approved', featured: false
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      setSubmitError('Please fill in all required fields marked with *');
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (!editMode && !useExistingOrganizer && (!formData.organizer?.name || !formData.organizer?.email)) {
      setSubmitError('Please provide organizer name and email for the new organizer account.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (!editMode && useExistingOrganizer && !selectedOrganizerId) {
      setSubmitError('Please select an existing organizer.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      ...formData,
      existingOrganizerId: useExistingOrganizer ? selectedOrganizerId : undefined
    };

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const endpoint = editMode ? `/api/events/update/${eventId}` : '/api/admin/create-event';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      setSubmitSuccess(true);
      const finalSlug = data.slug || data.id || eventId || (formData as any)?.slug || formData.id || '';
      setCreatedEventSlug(finalSlug);

      if (data.organizerCredentials) {
        setOrganizerCredentials(data.organizerCredentials);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Failed to ${editMode ? 'update' : 'create'} event`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-16 font-[family-name:var(--font-josefin)] max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
          Event {editMode ? 'Updated' : 'Created'} Successfully!
        </h3>
        <p className="text-[var(--fg-muted)] mb-8 text-lg">Your event has been {editMode ? 'updated' : 'created'} and is now live.</p>

        {organizerCredentials && (
          <div className="mb-8 p-6 bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded text-left shadow-lg">
            <h4 className="text-base font-bold text-[var(--primary)] mb-4 uppercase tracking-wide flex items-center gap-2">
              Organizer Dashboard Credentials
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[var(--bg)] rounded border border-[var(--border-subtle)]">
                <span className="text-[var(--fg-muted)] text-sm font-bold">Username:</span>
                <code className="text-[var(--fg)] text-sm font-mono">{organizerCredentials.username}</code>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--bg)] rounded border border-[var(--border-subtle)]">
                <span className="text-[var(--fg-muted)] text-sm font-bold">Password:</span>
                <code className="text-[var(--fg)] text-sm font-mono">{organizerCredentials.password}</code>
              </div>
            </div>
            <p className="text-[var(--primary)]/80 text-xs mt-4 font-medium uppercase tracking-wider text-center">Use these credentials at /organizer to access event analytics</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`/events/${createdEventSlug || eventId || (formData as any)?.slug || formData.id || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] transition-all shadow-lg uppercase tracking-wider font-bold text-sm"
          >
            View Event Live <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => {
              if (editMode) {
                window.location.href = '/organizer';
              } else {
                resetForm();
              }
            }}
            className="px-8 py-4 bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-card-hover)] transition-all uppercase tracking-wider font-bold text-sm"
          >
            {editMode ? 'Back to Dashboard' : 'Create Another Event'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-josefin)] max-w-5xl mx-auto pb-24">
      {/* Form Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 font-[family-name:var(--font-marcellus)]">
          <span className="text-[var(--primary)] uppercase tracking-wider relative inline-block">
            {editMode ? 'Edit Event Details' : 'Event Creation Form'}
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-[var(--gold)]/30 rounded-full" />
          </span>
        </h2>
        <p className="text-[var(--fg-muted)] mt-4">
          {editMode ? 'Update the details below for your event.' : 'Fill in the details below to publish a new event. All fields marked with * are required.'}
        </p>
      </div>

      {submitError && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-500 font-medium">
          ⚠️ {submitError}
        </div>
      )}

      <div className="space-y-12">
        {/* Basic Info Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Basic Info</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Event Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors text-lg font-bold"
                placeholder="Enter event title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Short Description</label>
              <input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => updateFormData('shortDescription', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="Brief one-liner about your event"
                maxLength={150}
              />
              <p className="text-xs text-[var(--fg-muted)] mt-1">{formData.shortDescription?.length || 0}/150 characters</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Full Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors min-h-[150px]"
                placeholder="Detailed description of your event..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Event Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => updateFormData('image', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="https://example.com/image.jpg or /image.png for local"
              />
              {formData.image && (
                <div className="mt-4 rounded-lg overflow-hidden border border-[var(--border-subtle)] p-2 bg-[var(--bg)] max-w-md">
                  <img src={formData.image} alt="Preview" className="w-full h-48 object-cover rounded" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Date & Time Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Date & Time</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.startDate?.slice(0, 16)}
                  onChange={(e) => updateFormData('startDate', e.target.value ? e.target.value + ':00Z' : '')}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">End Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.endDate?.slice(0, 16)}
                  onChange={(e) => updateFormData('endDate', e.target.value ? e.target.value + ':00Z' : '')}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded p-4">
              <p className="text-[var(--gold)] text-sm font-medium">
                Tip: For multi-day events (like hackathons), set the start date to when registration opens and the end date to when the event concludes.
              </p>
            </div>
          </div>
        </section>

        {/* Venue Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Venue</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-3 uppercase tracking-wide">Venue Type *</label>
              <div className="grid grid-cols-3 gap-3">
                {['physical', 'virtual', 'hybrid'].map((type) => (
                  <button
                    key={type}
                    onClick={() => updateFormData('venueType', type)}
                    type="button"
                    className={`py-3 px-4 rounded border transition-all uppercase tracking-wider text-sm font-bold ${
                      formData.venueType === type
                        ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md'
                        : 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Venue Name</label>
              <input
                type="text"
                value={typeof formData.venue === 'string' ? formData.venue : formData.venue?.name || ''}
                onChange={(e) => updateFormData('venue', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g., Innovation Hub Auditorium"
              />
            </div>

            {(formData.venueType === 'physical' || formData.venueType === 'hybrid') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg)] p-4 rounded border border-[var(--border-subtle)] pb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Address</label>
                  <input
                    type="text"
                    value={formData.location?.address}
                    onChange={(e) => updateFormData('location.address', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">City</label>
                  <input
                    type="text"
                    value={formData.location?.city}
                    onChange={(e) => updateFormData('location.city', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">State</label>
                  <input
                    type="text"
                    value={formData.location?.state}
                    onChange={(e) => updateFormData('location.state', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    placeholder="State/Province"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Country</label>
                  <input
                    type="text"
                    value={formData.location?.country}
                    onChange={(e) => updateFormData('location.country', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    placeholder="Country"
                  />
                </div>
              </div>
            )}

            {(formData.venueType === 'virtual' || formData.venueType === 'hybrid') && (
              <div className="bg-[var(--bg)] p-4 rounded border border-[var(--border-subtle)]">
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Virtual Event Link</label>
                <input
                  type="url"
                  value={formData.virtualLink}
                  onChange={(e) => updateFormData('virtualLink', e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                />
              </div>
            )}
          </div>
        </section>

        {/* Tickets Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Tickets & Team Setup</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Ticket Price</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateFormData('price', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors font-bold text-lg"
                    placeholder="0"
                    min="0"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => updateFormData('currency', e.target.value)}
                    className="px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors font-bold"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <p className="text-xs text-[var(--fg-muted)] mt-2 font-medium">Set to 0 for free events</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Original Price (for discounts)</label>
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => updateFormData('originalPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-[var(--fg-muted)] mt-2 font-medium">Shows as strikethrough if higher than price</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Capacity</label>
              <input
                type="number"
                value={formData.capacity || ''}
                onChange={(e) => updateFormData('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full md:w-1/2 px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="Unlimited (leave empty)"
                min="1"
              />
            </div>

            <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-5">
              <label className="flex items-center gap-4 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isTeamEvent}
                    onChange={(e) => updateFormData('isTeamEvent', e.target.checked)}
                    className="w-6 h-6 rounded bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-[var(--bg)]"
                  />
                </div>
                <div>
                  <span className="text-[var(--fg)] font-bold uppercase tracking-wide text-base block mb-1">Team Based Registration</span>
                  <p className="text-sm text-[var(--fg-muted)]">Participants register as teams instead of individuals. Ideal for hackathons.</p>
                </div>
              </label>

              {formData.isTeamEvent && (
                <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Min Team Size</label>
                    <input
                      type="number"
                      value={formData.teamSettings?.minTeamSize || 1}
                      onChange={(e) => updateFormData('teamSettings', {
                        ...formData.teamSettings,
                        minTeamSize: parseInt(e.target.value) || 1
                      })}
                      className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Max Team Size</label>
                    <input
                      type="number"
                      value={formData.teamSettings?.maxTeamSize || 4}
                      onChange={(e) => updateFormData('teamSettings', {
                        ...formData.teamSettings,
                        maxTeamSize: parseInt(e.target.value) || 4
                      })}
                      className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      min="1"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.teamSettings?.allowIndividual}
                        onChange={(e) => updateFormData('teamSettings', {
                          ...formData.teamSettings,
                          allowIndividual: e.target.checked
                        })}
                        className="w-5 h-5 rounded bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-[var(--bg)]"
                      />
                      <span className="text-[var(--fg)] text-sm font-bold uppercase tracking-wide">Allow Teams of 1 (Individual)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Categories, Tags, and Details */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Details & Categorization</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Primary Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                >
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Additional Categories</label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded">
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all border ${
                        formData.categories?.includes(cat)
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                          : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Badges / Highlights</label>
              <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded">
                {AVAILABLE_BADGES.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => toggleBadge(badge)}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all border ${
                      formData.badges?.includes(badge)
                        ? 'bg-[var(--gold)] border-[var(--gold)] text-black shadow-sm'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Search Tags</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Type a tag and press Enter"
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full text-sm font-bold flex items-center gap-2"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-[var(--primary)]/50 hover:text-[var(--primary)]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <label className="block text-sm font-bold text-[var(--fg)] mb-4 uppercase tracking-wide">Requirements</label>
              <div className="space-y-3">
                {formData.requirements?.map((req, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <span className="text-[var(--gold)] font-bold">{index + 1}.</span>
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder="e.g., Laptop required"
                    />
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="p-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded border border-transparent hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRequirement}
                  className="flex items-center gap-2 px-4 py-3 text-[var(--primary)] border border-dashed border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 hover:border-[var(--primary)] rounded transition-colors text-sm font-bold uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> Add Requirement
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Organizer Section */}
        {!isOrganizer && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Organizer Info</h3>
          <div className="space-y-6">
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setUseExistingOrganizer(false)}
                className={`flex-1 py-3 px-4 rounded border transition-all uppercase tracking-wider text-sm font-bold ${
                  !useExistingOrganizer
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                Create New Organizer
              </button>
              <button
                type="button"
                onClick={() => setUseExistingOrganizer(true)}
                className={`flex-1 py-3 px-4 rounded border transition-all uppercase tracking-wider text-sm font-bold ${
                  useExistingOrganizer
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                Use Existing Organizer
              </button>
            </div>

            {useExistingOrganizer ? (
              <div className="bg-[var(--bg)] p-5 rounded border border-[var(--border-subtle)]">
                <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Select Organizer *</label>
                <select
                  value={selectedOrganizerId}
                  onChange={(e) => {
                    setSelectedOrganizerId(e.target.value);
                    const org = organizersList.find(o => o.id === e.target.value);
                    if (org) {
                      updateFormData('organizer', { name: org.organizerName || org.username, email: org.email || '' });
                      updateFormData('organizationName', org.organizerName || org.username);
                    }
                  }}
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  required
                >
                  <option value="">-- Select an Organizer --</option>
                  {organizersList.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.organizerName || org.name || org.username} ({org.username})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg)] p-5 rounded border border-[var(--border-subtle)]">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Contact Name *</label>
                    <input
                      type="text"
                      value={formData.organizer?.name}
                      onChange={(e) => updateFormData('organizer', { ...formData.organizer, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder="Organizer name"
                      required={!useExistingOrganizer}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Contact Email *</label>
                    <input
                      type="email"
                      value={formData.organizer?.email}
                      onChange={(e) => updateFormData('organizer', { ...formData.organizer, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder="email@example.com"
                      required={!useExistingOrganizer}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Organization Name</label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => updateFormData('organizationName', e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder="e.g., MLSC - MRUH"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Avatar URL</label>
                    <input
                      type="url"
                      value={formData.organizer?.avatar}
                      onChange={(e) => updateFormData('organizer', { ...formData.organizer, avatar: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Organization Description</label>
                  <textarea
                    value={formData.organizationDescription}
                    onChange={(e) => updateFormData('organizationDescription', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors min-h-[100px]"
                    placeholder="Brief description of the organizing body..."
                  />
                </div>
              </>
            )}

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <label className="block text-sm font-bold text-[var(--fg)] mb-4 uppercase tracking-wide">Social Links</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {['website', 'instagram', 'linkedin', 'twitter', 'youtube', 'discord', 'github'].map((platform) => (
                  <div key={platform}>
                    <div className="flex items-center gap-2 mb-1 pl-1">
                      <label className="block text-xs text-[var(--fg-muted)] capitalize font-bold tracking-wide">{platform}</label>
                    </div>
                    <input
                      type="url"
                      value={(formData.organizerLinks as any)?.[platform] || ''}
                      onChange={(e) => updateFormData('organizerLinks', {
                        ...formData.organizerLinks,
                        [platform]: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      placeholder={`https://${platform}.com/...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Agenda Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Agenda</h3>
          <div className="space-y-6">
            {(!formData.agenda || formData.agenda.length === 0) && (
              <div className="text-center py-8 border-2 border-dashed border-[var(--border-subtle)] rounded bg-[var(--bg-card)]">
                <p className="text-[var(--fg-muted)] text-sm mb-4">No agenda items added yet.</p>
                <button
                  type="button"
                  onClick={addAgendaItem}
                  className="bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--primary)] font-bold text-sm uppercase tracking-wider px-6 py-2 rounded transition-all"
                >
                  Add First Item
                </button>
              </div>
            )}

            <div className="space-y-4">
              {formData.agenda?.map((item, index) => (
                <div key={index} className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-5">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-[var(--border-subtle)]">
                    <span className="text-base text-[var(--primary)] font-bold uppercase tracking-wide">Agenda Item {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAgendaItem(index)}
                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-[var(--fg-muted)] mb-1 font-bold uppercase tracking-wide">Time / Duration</label>
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => updateAgendaItem(index, 'time', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)]"
                        placeholder="e.g., 09:00 - 10:00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-[var(--fg-muted)] mb-1 font-bold uppercase tracking-wide">Session Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] font-bold"
                        placeholder="Keynote Speech"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--fg-muted)] mb-1 font-bold uppercase tracking-wide">Description (optional)</label>
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => updateAgendaItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] min-h-[60px]"
                      placeholder="Brief description of this session..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {formData.agenda && formData.agenda.length > 0 && (
              <button
                type="button"
                onClick={addAgendaItem}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-[var(--border-subtle)] text-[var(--primary)] rounded-lg hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors uppercase tracking-wider font-bold text-sm"
              >
                <Plus className="w-5 h-5" /> Add Another Agenda Item
              </button>
            )}
          </div>
        </section>

        {/* Admin Settings Section */}
        {!isOrganizer && (
        <section className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-6 md:p-8 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-[var(--primary)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--primary)]/20 pb-4">Admin Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Publish Status</label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] font-bold"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[var(--fg)] mb-2 uppercase tracking-wide">Approval Status</label>
              <select
                value={formData.approvalStatus}
                onChange={(e) => updateFormData('approvalStatus', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] font-bold"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center pt-8">
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded w-full">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => updateFormData('featured', e.target.checked)}
                  className="w-5 h-5 rounded bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-[var(--fg)] font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                  Featured Event
                </span>
              </label>
            </div>
          </div>
        </section>
        )}
        {/* Submit Button Section */}
        <div className="pt-8 pb-4 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-bold rounded shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg text-lg uppercase tracking-wider mb-safe"
          >
            {isSubmitting ? (
              <>
                <Spinner inline />
                Processing Event...
              </>
            ) : (
              <>
                <Check className="w-6 h-6" />
                {editMode ? 'Update Event' : 'Publish Event'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
