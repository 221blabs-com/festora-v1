'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Calendar,
  LogOut,
  ChevronRight,
  Sparkles,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  Users,
  IndianRupee,
  MapPin,
  Clock,
  RefreshCw,
  Search,
  List,
  Rocket,
  GraduationCap,
  Mic,
  Trophy,
  Handshake,
  Building2,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Spinner } from '@/components/ui/spinner';
import { SuccessNotification } from '@/components/ui/success-notification';
import EventForm from '@/components/events/EventForm';
// Uses server-side API routes (firebase-admin) for all Firestore operations
// to avoid client-side permission errors

interface SystemAdminAuth {
  isAuthenticated: boolean;
  adminName: string;
}

const SYSTEM_ADMIN_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_SYSTEM_ADMIN_USERNAME,
  password: process.env.NEXT_PUBLIC_SYSTEM_ADMIN_PASSWORD
};

const SYSTEM_ADMIN_SESSION_KEY = process.env.NEXT_PUBLIC_SYSTEM_ADMIN_SESSION_KEY || 'festora_system_admin_session';
const SESSION_EXPIRY_HOURS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_HOURS || '24');

interface EventData {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  dateTime?: {
    startDate: string;
    endDate?: string;
  };
  startDate?: string;
  endDate?: string;
  venue?: string | { name?: string; address?: string };
  venueType?: string;
  virtualLink?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  ticketPrice?: number;
  price?: number;
  originalPrice?: number;
  isPaid?: boolean;
  currency?: string;
  totalTickets?: number;
  capacity?: number;
  ticketsSold?: number;
  isTeamEvent?: boolean;
  teamSettings?: {
    minTeamSize?: number;
    maxTeamSize?: number;
    allowIndividual?: boolean;
  };
  category?: string;
  categories?: string[];
  tags?: string[];
  badges?: string[];
  requirements?: string[];
  organizer?: {
    name?: string;
    email?: string;
  };
  organizationName?: string;
  organizationDescription?: string;
  organizerLinks?: Record<string, string>;
  featured?: boolean;
  status?: string;
  approvalStatus?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

export default function SystemAdminPage() {
  const [auth, setAuth] = useState<SystemAdminAuth>({
    isAuthenticated: false,
    adminName: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Event management states
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'requests' | 'organizers'>('create');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Organizer request states
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeRequestModal, setActiveRequestModal] = useState<{ request: any; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [requestActionOutcome, setRequestActionOutcome] = useState<{
    success: boolean;
    action: 'approve' | 'reject';
    organizationName: string;
    username?: string;
    password?: string;
    email?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Manage Organizers states
  const [organizersList, setOrganizersList] = useState<any[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [organizerFormData, setOrganizerFormData] = useState<any>({});
  const [savingOrganizer, setSavingOrganizer] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<EventData>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingOrganizers, setCreatingOrganizers] = useState(false);
  const [organizerResults, setOrganizerResults] = useState<{ eventTitle: string; username: string; password: string; status: string }[] | null>(null);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SYSTEM_ADMIN_SESSION_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        // Check if session is still valid (not expired)
        if (session.expiry && new Date().getTime() < session.expiry) {
          setAuth({
            isAuthenticated: true,
            adminName: session.adminName
          });
        } else {
          // Session expired, clear it
          localStorage.removeItem(SYSTEM_ADMIN_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading system admin session:', error);
      localStorage.removeItem(SYSTEM_ADMIN_SESSION_KEY);
    }
    setIsLoading(false);
  }, []);

  // Hide footer
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    return () => {
      if (footer) footer.style.display = '';
    };
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      if (activeTab === 'manage') fetchEvents();
      if (activeTab === 'requests') fetchRequests();
      if (activeTab === 'organizers') fetchOrganizers();
    }
  }, [auth.isAuthenticated, activeTab]);

  const fetchOrganizers = async () => {
    setLoadingOrganizers(true);
    try {
      const response = await fetch('/api/admin/list-organizers');
      const data = await response.json();
      if (data.success && data.organizers) {
        setOrganizersList(data.organizers);
      }
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoadingOrganizers(false);
    }
  };

  const handleSaveOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrganizer(true);

    try {
      const isNew = !organizerFormData.id;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch('/api/admin/manage-organizers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organizerFormData)
      });

      const data = await response.json();
      if (data.success) {
        setShowOrganizerModal(false);
        fetchOrganizers(); // Refresh list
      } else {
        alert(data.error || 'Failed to save organizer');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setSavingOrganizer(false);
    }
  };

  const handleDeleteOrganizer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this organizer? This will not delete their events.')) return;
    try {
      const response = await fetch(`/api/admin/manage-organizers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchOrganizers();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch('/api/admin/list-events');
      const data = await response.json();
      if (data.success && data.events) {
        setEvents(data.events as EventData[]);
      } else {
        console.error('Failed to fetch events:', data.error);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/admin/list-requests');
      const data = await res.json();
      if (data.success && data.requests) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = (idOrRequest: any, action: 'approve' | 'reject') => {
    const req = typeof idOrRequest === 'string'
      ? requests.find(r => r.id === idOrRequest)
      : idOrRequest;
    if (req) {
      setActiveRequestModal({ request: req, action });
      setRejectionReasonInput('');
    }
  };

  const executeRequestAction = async (request: any, action: 'approve' | 'reject', reason?: string) => {
    const id = request.id;
    setProcessingRequest(id);
    try {
      const res = await fetch(`/api/admin/approve-organizer/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(reason ? { rejectionReason: reason } : {}) })
      });
      const data = await res.json();
      if (data.success) {
<<<<<<< HEAD
        if (action === 'approve') {
          setRequestSuccessMessage('The event request has been accepted and the organizer has been notified via email.');
        } else {
          alert('Application successfully rejected! The organizer has been notified via email.');
        }
=======
        setRequestActionOutcome({
          success: true,
          action,
          organizationName: request.organizationName,
          username: data.username || request.username,
          password: data.password || request.password || 'welcome@123',
          email: request.email,
          message: action === 'approve'
            ? 'Organizer account verified & event catalog publication live.'
            : 'Application marked rejected and notice dispatched.'
        });
        setActiveRequestModal(null);
        setRejectionReasonInput('');
>>>>>>> d4d8eef (add the talk expert page and remove github login page and add the add forms)
        fetchRequests(); // refresh list
      } else {
        setRequestActionOutcome({
          success: false,
          action,
          organizationName: request.organizationName,
          error: data.error || 'Failed to process application'
        });
      }
    } catch (err: any) {
      console.error('Error processing application:', err);
      setRequestActionOutcome({
        success: false,
        action,
        organizationName: request.organizationName,
        error: err?.message || 'Server error occurred while executing request action'
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/update-event?eventId=${encodeURIComponent(eventId)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setEvents(events.filter(e => e.id !== eventId));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete event: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleEditEvent = (event: EventData) => {
    setEditingEvent(event);
    // Copy all editable fields
    setEditFormData({ ...event });
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;

    setSavingEdit(true);
    try {
      // Don't send the id or internal fields as updates
      const { id, createdAt, createdBy, ...updates } = editFormData;

      const response = await fetch('/api/admin/update-event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: editingEvent.id,
          updates
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state with returned event
        setEvents(events.map(e =>
          e.id === editingEvent.id ? (data.event || { ...e, ...editFormData }) : e
        ));
        setEditingEvent(null);
        setEditFormData({});
      } else {
        alert('Failed to update event: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateOrganizers = async () => {
    setCreatingOrganizers(true);
    setOrganizerResults(null);
    try {
      const response = await fetch('/api/admin/create-organizers', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setOrganizerResults(data.organizers);
      } else {
        alert('Failed to create organizers: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating organizers:', error);
      alert('Failed to create organizers. Please try again.');
    } finally {
      setCreatingOrganizers(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === SYSTEM_ADMIN_CREDENTIALS.username &&
      password === SYSTEM_ADMIN_CREDENTIALS.password) {
      setAuth({ isAuthenticated: true, adminName: 'System Administrator' });
      setLoginError('');

      // Save session to localStorage with expiry
      const session = {
        adminName: 'System Administrator',
        expiry: new Date().getTime() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
      };
      localStorage.setItem(SYSTEM_ADMIN_SESSION_KEY, JSON.stringify(session));
    } else {
      setLoginError('Invalid credentials. Access denied.');
    }
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, adminName: '' });
    setUsername('');
    setPassword('');
    localStorage.removeItem(SYSTEM_ADMIN_SESSION_KEY);
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#080410] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--navy)_0%,_var(--bg)_100%)] opacity-40" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--gold)]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-[var(--bg-card)] backdrop-blur-2xl border border-[var(--border-gold)] rounded-sm p-8 shadow-2xl relative overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)]" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-sm mb-4 shadow-lg shadow-[var(--primary)]/25 rounded-full">
                <Shield className="w-8 h-8 text-[var(--fg)] " />
              </div>
              <h1 className="text-2xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)]">System Admin Portal</h1>
              <p className="text-[var(--fg-muted)] text-sm">Template-based event creation system</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] transition-all"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] transition-all"
                  placeholder="Enter password"
                />
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-sm p-3 text-[var(--primary-light)] text-sm text-center"
                >
                  {loginError}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-semibold rounded-sm hover:brightness-110 transition-all duration-300 shadow-lg shadow-[var(--primary)]/25 uppercase tracking-wider text-sm"
              >
                Access System Admin
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <SuccessNotification
        open={!!requestSuccessMessage}
        title="Event Request Accepted!"
        message={requestSuccessMessage || ''}
        onClose={() => setRequestSuccessMessage(null)}
      />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--border-gold)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--primary)] w-10 h-10 rounded-sm rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 mt-2 mb-2 ml-2">
                <Shield className="w-5 h-5 text-white " />
              </div>
              <div className="ml-2">
                <h1 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">System Admin</h1>
                <p className="text-xs text-[var(--fg-muted)]">Event Management System</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1 rounded-sm overflow-x-auto">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'create'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
                  }`}
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'manage'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
                  }`}
              >
                <List className="w-4 h-4" />
                Manage
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'requests'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
                  }`}
              >
                <Users className="w-4 h-4" />
                Requests
                {requests.length > 0 && activeTab !== 'requests' && (
                  <span className="bg-[var(--gold)] text-[var(--navy)] text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {requests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('organizers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'organizers'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
                  }`}
              >
                <Building2 className="w-4 h-4" />
                Organizers
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg-muted)] rounded-sm hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)] transition-all uppercase text-xs tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EventForm />
          </motion.div>
        )}

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
          <>
            {/* Header with search and refresh */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)]">Manage Events</h2>
                <p className="text-[var(--fg-muted)]">View, edit, and delete existing events</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>
                <button
                  onClick={fetchEvents}
                  disabled={loadingEvents}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-50"
                >
                  {loadingEvents ? <Spinner inline /> : <RefreshCw className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Events List */}
            {loadingEvents ? (
              <div className="flex items-center justify-center py-20">
                <Spinner />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-4" />
                <p className="text-[var(--fg-muted)] text-lg">No events found</p>
                <p className="text-[var(--fg-muted)] text-sm mt-2">Create your first event using the Create tab</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--gold)] rounded-sm p-6 transition-all group"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <h3 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">{event.title}</h3>
                          {event.isPaid ? (
                            <span className="px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-xs rounded-sm uppercase tracking-wide">Paid</span>
                          ) : (
                            <span className="px-2 py-1 bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border-subtle)] text-xs rounded-sm uppercase tracking-wide">Free</span>
                          )}
                          {event.isTeamEvent && (
                            <span className="px-2 py-1 bg-[var(--navy)]/50 text-[var(--gold)] border border-[var(--gold)]/20 text-xs rounded-sm uppercase tracking-wide">Team</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                            <Clock className="w-4 h-4 text-[var(--gold)]" />
                            {event.dateTime?.startDate
                              ? new Date(event.dateTime.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'No date set'}
                          </div>
                          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                            <MapPin className="w-4 h-4 text-[var(--gold)]" />
                            {typeof event.venue === 'string' ? event.venue : (event.venue?.name || 'No venue')}
                          </div>
                          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                            <IndianRupee className="w-4 h-4 text-[var(--gold)]" />
                            {event.isPaid ? `₹${event.ticketPrice || 0}` : 'Free'}
                          </div>
                          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                            <Users className="w-4 h-4 text-[var(--gold)]" />
                            {event.ticketsSold || 0} / {event.totalTickets || '∞'} sold
                          </div>
                        </div>

                        <p className="text-[var(--fg-muted)] text-xs mt-3 font-mono">ID: {event.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(`/events/${event.id}`, '_blank')}
                          className="p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--gold)] transition-all"
                          title="View Event"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
                          title="Edit Event"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(event.id)}
                          className="p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                          title="Delete Event"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4">
                <p className="text-[var(--fg-muted)] text-xs uppercase tracking-wider mb-1">Total Events</p>
                <p className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">{events.length}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4">
                <p className="text-[var(--fg-muted)] text-xs uppercase tracking-wider mb-1">Paid Events</p>
                <p className="text-2xl font-bold text-[var(--primary)] font-[family-name:var(--font-marcellus)]">{events.filter(e => e.isPaid).length}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4">
                <p className="text-[var(--fg-muted)] text-xs uppercase tracking-wider mb-1">Free Events</p>
                <p className="text-2xl font-bold text-[var(--gold)] font-[family-name:var(--font-marcellus)]">{events.filter(e => !e.isPaid).length}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4">
                <p className="text-[var(--fg-muted)] text-xs uppercase tracking-wider mb-1">Total Tickets Sold</p>
                <p className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">{events.reduce((acc, e) => acc + (e.ticketsSold || 0), 0)}</p>
              </div>
            </div>

            {/* Create Organizers Section */}
            <div className="mt-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 rounded-full blur-2xl" />

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">Organizer Credentials</h3>
                  <p className="text-[var(--fg-muted)] text-sm">Create organizer dashboard access for all events</p>
                </div>
                <button
                  onClick={handleCreateOrganizers}
                  disabled={creatingOrganizers}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 uppercase text-xs tracking-wider"
                >
                  {creatingOrganizers ? (
                    <>
                      <Spinner inline />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Create Organizers for All Events
                    </>
                  )}
                </button>
              </div>

              {organizerResults && (
                <div className="mt-4 max-h-64 overflow-y-auto relative z-10">
                  <table className="w-full text-sm">
                    <thead className="text-[var(--fg-muted)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="text-left py-2 px-2 font-normal uppercase text-xs tracking-wider">Event</th>
                        <th className="text-left py-2 px-2 font-normal uppercase text-xs tracking-wider">Username</th>
                        <th className="text-left py-2 px-2 font-normal uppercase text-xs tracking-wider">Password</th>
                        <th className="text-left py-2 px-2 font-normal uppercase text-xs tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizerResults.map((org, index) => (
                        <tr key={index} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)]">
                          <td className="py-2 px-2 text-[var(--fg)]">{org.eventTitle}</td>
                          <td className="py-2 px-2">
                            <code className="bg-[var(--bg)] border border-[var(--border-subtle)] px-2 py-1 rounded-sm text-[var(--primary)] font-mono text-xs">{org.username}</code>
                          </td>
                          <td className="py-2 px-2">
                            <code className="bg-[var(--bg)] border border-[var(--border-subtle)] px-2 py-1 rounded-sm text-[var(--fg-muted)] font-mono text-xs">{org.password}</code>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded-sm text-xs ${org.status === 'created'
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}>
                              {org.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ORGANIZERS TAB */}
        {activeTab === 'organizers' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)]">Manage Organizers</h2>
                <p className="text-[var(--fg-muted)]">View, create, and manage organizer accounts</p>
              </div>
              <button
                onClick={() => {
                  setOrganizerFormData({ verified: true });
                  setShowOrganizerModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-sm hover:brightness-110 transition-all uppercase text-xs tracking-wider"
              >
                <Plus className="w-4 h-4" /> Create Organizer
              </button>
            </div>

            {loadingOrganizers ? (
              <div className="flex items-center justify-center py-20">
                <Spinner />
              </div>
            ) : organizersList.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-4" />
                <p className="text-[var(--fg-muted)] text-lg">No organizers found</p>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg)] border-b border-[var(--border-subtle)] text-[var(--fg-muted)]">
                    <tr>
                      <th className="text-left py-4 px-6 font-normal uppercase text-xs tracking-wider">Name</th>
                      <th className="text-left py-4 px-6 font-normal uppercase text-xs tracking-wider">Username</th>
                      <th className="text-left py-4 px-6 font-normal uppercase text-xs tracking-wider">Email</th>
                      <th className="text-center py-4 px-6 font-normal uppercase text-xs tracking-wider">Verified</th>
                      <th className="text-right py-4 px-6 font-normal uppercase text-xs tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizersList.map(org => (
                      <tr key={org.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-4 px-6 text-[var(--fg)] font-medium">{org.organizerName || org.name || 'Unnamed'}</td>
                        <td className="py-4 px-6">
                          <code className="bg-[var(--bg)] border border-[var(--border-subtle)] px-2 py-1 rounded-sm text-[var(--primary)] font-mono text-xs">{org.username}</code>
                        </td>
                        <td className="py-4 px-6 text-[var(--fg-muted)]">{org.email || '-'}</td>
                        <td className="py-4 px-6 text-center">
                          {org.verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs uppercase">
                              <CheckCircle className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs uppercase">
                              <AlertTriangle className="w-3 h-3" /> No
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setOrganizerFormData(org);
                                setShowOrganizerModal(true);
                              }}
                              className="p-1.5 text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrganizer(org.id)}
                              className="p-1.5 text-[var(--fg-muted)] hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Organizer Create/Edit Modal */}
      <AnimatePresence>
        {showOrganizerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-sm p-6 max-w-md w-full relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">
                  {organizerFormData.id ? 'Edit Organizer' : 'Create Organizer'}
                </h3>
                <button onClick={() => setShowOrganizerModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOrganizer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={organizerFormData.organizerName || ''}
                    onChange={e => setOrganizerFormData({ ...organizerFormData, organizerName: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1">Username *</label>
                  <input
                    type="text"
                    required={!organizerFormData.id}
                    disabled={!!organizerFormData.id}
                    value={organizerFormData.username || ''}
                    onChange={e => setOrganizerFormData({ ...organizerFormData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] disabled:opacity-50 focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1">
                    {organizerFormData.id ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!organizerFormData.id}
                    value={organizerFormData.password || ''}
                    onChange={e => setOrganizerFormData({ ...organizerFormData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1">Email</label>
                  <input
                    type="email"
                    value={organizerFormData.email || ''}
                    onChange={e => setOrganizerFormData({ ...organizerFormData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="verifiedCheck"
                    checked={organizerFormData.verified || false}
                    onChange={e => setOrganizerFormData({ ...organizerFormData, verified: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <label htmlFor="verifiedCheck" className="text-sm text-[var(--fg)]">Account is verified</label>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setShowOrganizerModal(false)}
                    className="px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingOrganizer}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-sm hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingOrganizer ? <Spinner /> : (organizerFormData.id ? 'Save Changes' : 'Create Organizer')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-sm p-6 max-w-md w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-sm flex items-center justify-center rounded-full">
                  <AlertTriangle className="w-6 h-6 text-[var(--primary)] " />
                </div>
                <div className="ml-2">
                  <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">Delete Event</h3>
                  <p className="text-[var(--fg-muted)] text-sm">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-[var(--fg-muted)] mb-6">
                Are you sure you want to delete this event? All associated tickets and registrations will also be affected.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] transition-all uppercase text-xs tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-sm hover:brightness-110 transition-all uppercase text-xs tracking-wider"
                >
                  Delete Event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {editingEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingEvent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-sm p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)]" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm flex items-center justify-center rounded-full">
                    <Edit className="w-6 h-6 text-[var(--primary)] " />
                  </div>
                  <div className="ml-2">
                    <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">Edit Event</h3>
                    <p className="text-[var(--fg-muted)] text-sm font-mono">{editingEvent.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Event Title</label>
                  <input
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Description</label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Ticket Price */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Ticket Price (₹)</label>
                    <input
                      type="number"
                      value={editFormData.ticketPrice || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, ticketPrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>

                  {/* Total Tickets */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Total Tickets</label>
                    <input
                      type="number"
                      value={editFormData.totalTickets || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, totalTickets: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                </div>

                {/* Is Paid */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={editFormData.isPaid || false}
                    onChange={(e) => setEditFormData({ ...editFormData, isPaid: e.target.checked })}
                    className="w-5 h-5 rounded-sm bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--gold)]"
                  />
                  <label htmlFor="isPaid" className="text-[var(--fg)]">This is a paid event</label>
                </div>

                {/* Venue */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Venue Name</label>
                    <input
                      type="text"
                      value={typeof editFormData.venue === 'string' ? editFormData.venue : (editFormData.venue?.name || '')}
                      onChange={(e) => setEditFormData({ ...editFormData, venue: { ...(typeof editFormData.venue === 'object' ? editFormData.venue : {}), name: e.target.value } })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Venue Type</label>
                    <select
                      value={editFormData.venueType || 'physical'}
                      onChange={(e) => setEditFormData({ ...editFormData, venueType: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    >
                      <option value="physical">Physical</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Start Date</label>
                    <input
                      type="datetime-local"
                      value={editFormData.startDate ? new Date(editFormData.startDate).toISOString().slice(0, 16) : (editFormData.dateTime?.startDate ? new Date(editFormData.dateTime.startDate).toISOString().slice(0, 16) : '')}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value, dateTime: { ...editFormData.dateTime, startDate: e.target.value } })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      value={editFormData.endDate ? new Date(editFormData.endDate).toISOString().slice(0, 16) : (editFormData.dateTime?.endDate ? new Date(editFormData.dateTime.endDate).toISOString().slice(0, 16) : '')}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value, dateTime: { ...editFormData.dateTime, startDate: editFormData.dateTime?.startDate || '', endDate: e.target.value } })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                </div>

                {/* Capacity & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Capacity</label>
                    <input
                      type="number"
                      value={editFormData.capacity || editFormData.totalTickets || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, capacity: parseInt(e.target.value) || 0, totalTickets: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Category</label>
                    <input
                      type="text"
                      value={editFormData.category || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={(editFormData.tags || []).join(', ')}
                    onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    placeholder="AI, Tech, Hackathon"
                  />
                </div>

                {/* Organizer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={editFormData.organizationName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, organizationName: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Status</label>
                    <select
                      value={editFormData.status || 'published'}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.featured || false}
                      onChange={(e) => setEditFormData({ ...editFormData, featured: e.target.checked })}
                      className="w-5 h-5 rounded-sm bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-[var(--fg)] text-sm">Featured Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isTeamEvent || false}
                      onChange={(e) => setEditFormData({ ...editFormData, isTeamEvent: e.target.checked })}
                      className="w-5 h-5 rounded-sm bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-[var(--fg)] text-sm">Team Event</span>
                  </label>
                </div>

                {/* Team Settings (conditional) */}
                {editFormData.isTeamEvent && (
                  <div className="grid grid-cols-3 gap-4 p-4 border border-[var(--border-subtle)] bg-[var(--bg)]">
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2 uppercase tracking-wider">Min Team Size</label>
                      <input
                        type="number"
                        value={editFormData.teamSettings?.minTeamSize || 2}
                        onChange={(e) => setEditFormData({ ...editFormData, teamSettings: { ...editFormData.teamSettings, minTeamSize: parseInt(e.target.value) || 2, maxTeamSize: editFormData.teamSettings?.maxTeamSize || 4 } })}
                        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2 uppercase tracking-wider">Max Team Size</label>
                      <input
                        type="number"
                        value={editFormData.teamSettings?.maxTeamSize || 4}
                        onChange={(e) => setEditFormData({ ...editFormData, teamSettings: { ...editFormData.teamSettings, minTeamSize: editFormData.teamSettings?.minTeamSize || 2, maxTeamSize: parseInt(e.target.value) || 4 } })}
                        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={editFormData.teamSettings?.allowIndividual || false}
                          onChange={(e) => setEditFormData({ ...editFormData, teamSettings: { ...editFormData.teamSettings, minTeamSize: editFormData.teamSettings?.minTeamSize || 2, maxTeamSize: editFormData.teamSettings?.maxTeamSize || 4, allowIndividual: e.target.checked } })}
                          className="w-4 h-4 rounded-sm bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--gold)]"
                        />
                        <span className="text-[var(--fg)] text-xs">Allow Solo</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] transition-all uppercase text-sm tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 px-4 py-3 bg-[var(--primary)] text-white font-semibold rounded-sm hover:brightness-110 transition-all disabled:opacity-50 uppercase text-sm tracking-wider shadow-lg shadow-[var(--primary)]/20"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)]">Organizer Requests</h2>
              <p className="text-[var(--fg-muted)]">Review and approve new organizer applications</p>
            </div>
            <button
              onClick={fetchRequests}
              disabled={loadingRequests}
              className="p-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-50"
            >
              {loadingRequests ? <Spinner inline /> : <RefreshCw className="w-5 h-5" />}
            </button>
          </div>

          {loadingRequests ? (
            <div className="flex items-center justify-center py-20">
              <Spinner inline />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-4" />
              <p className="text-[var(--fg-muted)] text-lg">No pending requests</p>
              <p className="text-[var(--fg-muted)] text-sm mt-2">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--bg)] border-2 border-[var(--border-gold)] rounded-xl relative overflow-hidden group shadow-xl"
                >
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6 px-4 py-1.5 bg-[var(--gold)] text-[var(--navy)] text-xs rounded-full uppercase tracking-wider font-bold shadow-lg shadow-[var(--gold)]/20 z-10">
                    {req.status}
                  </div>

                  <div className="p-0 flex flex-col lg:flex-row">
                    {/* Left Column: Organizer Info */}
                    <div className="flex-1 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] bg-[var(--bg-card)]">
                      <div>
                        <h3 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] flex items-center gap-3">
                          <Building2 className="w-6 h-6 text-[var(--primary)]" />
                          {req.organizationName}
                        </h3>
                        <p className="text-[var(--gold)] text-sm font-bold mt-1 uppercase tracking-wider">
                          Requested Handle: @{req.username}
                        </p>
                      </div>

                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                        <div>
                          <span className="text-[var(--fg-muted)] uppercase tracking-wider text-[10px] block mb-1">Contact Person</span>
                          <span className="text-[var(--fg)] font-medium text-base">{req.contactName}</span>
                        </div>
                        <div>
                          <span className="text-[var(--fg-muted)] uppercase tracking-wider text-[10px] block mb-1">Email</span>
                          <span className="text-[var(--fg)] font-medium break-words">{req.email}</span>
                        </div>
                        <div>
                          <span className="text-[var(--fg-muted)] uppercase tracking-wider text-[10px] block mb-1">Phone</span>
                          <span className="text-[var(--fg)] font-medium">{req.phone || 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[var(--fg-muted)] uppercase tracking-wider text-[10px] block mb-1">Event Types Portfolio</span>
                          <span className="text-[var(--fg)]">{req.eventTypes || 'None specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Event Details & Action */}
                    <div className="flex-[1.2] flex flex-col justify-between p-6 md:p-8 relative">
                      {req.eventDetails ? (
                        <div className="bg-[var(--bg)]/50 border border-[var(--border-subtle)] rounded-lg p-5 mb-8">
                          <h4 className="text-xs uppercase tracking-widest text-[var(--fg-muted)] font-bold mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--primary)]" />
                            Accompanying Event Submission
                          </h4>
                          <h5 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-2">
                            {req.eventDetails.title}
                          </h5>
                          <p className="text-sm text-[var(--fg-muted)] line-clamp-2 mb-4">
                            {req.eventDetails.description || 'No description provided.'}
                          </p>

                          <div className="flex flex-wrap gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-[var(--fg)]">
                              <Clock className="w-3.5 h-3.5 text-[var(--gold)]" />
                              {new Date(req.eventDetails.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1.5 text-[var(--fg)]">
                              <MapPin className="w-3.5 h-3.5 text-[var(--gold)]" />
                              {req.eventDetails.venue || req.eventDetails.venueType}
                            </div>
                            <div className="flex items-center gap-1.5 text-[var(--fg)]">
                              <IndianRupee className="w-3.5 h-3.5 text-[var(--gold)]" />
                              {req.eventDetails.price > 0 ? `${req.eventDetails.price} ${req.eventDetails.currency}` : 'Free Entry'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[var(--bg)]/50 border border-dashed border-[var(--border-subtle)] rounded-lg p-5 mb-8 flex flex-col items-center justify-center text-center opacity-70 h-full min-h-[160px]">
                          <Sparkles className="w-6 h-6 text-[var(--fg-muted)] mb-2" />
                          <p className="text-sm text-[var(--fg-muted)]">No inaugural event submitted.</p>
                        </div>
                      )}

                      {/* Actions in Crimson Red & Yellow */}
                      <div className="flex sm:flex-row flex-col gap-3 justify-end mt-auto">
                        <button
                          onClick={() => handleApproveRequest(req, 'reject')}
                          disabled={processingRequest === req.id}
                          className="px-6 py-3 bg-[#1a0408] border border-yellow-400/30 hover:border-red-500/60 hover:bg-red-950/40 text-red-200 font-semibold rounded-none transition-all disabled:opacity-50 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" /> Reject
                        </button>
                        <button
                          onClick={() => handleApproveRequest(req, 'approve')}
                          disabled={processingRequest === req.id}
                          className="px-8 py-3 bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold rounded-none hover:brightness-110 transition-all disabled:opacity-50 border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.5)] text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                        >
                          {processingRequest === req.id ? <Spinner inline /> : <><Shield className="w-4 h-4 text-yellow-300" /> Review &amp; Accept Request</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Rectangular Profile Card Modal for Request Review & Acceptance (NO browser alerts!) */}
      <AnimatePresence>
        {activeRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => {
              if (!processingRequest) setActiveRequestModal(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#120408] border-2 border-yellow-400 p-6 sm:p-8 rounded-none sm:rounded-sm shadow-[0_0_60px_rgba(220,38,38,0.5)] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Art-Deco Yellow Corner Brackets on the rectangular card */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400" />

              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-yellow-400/30 pb-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">
                    <Shield className="w-4 h-4 text-yellow-400" />
                    <span>Organizer Application Profile</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                    {activeRequestModal.request.organizationName}
                  </h3>
                  <p className="text-yellow-300 font-mono text-xs mt-0.5">
                    Handle: @{activeRequestModal.request.username}
                  </p>
                </div>
                <button
                  onClick={() => setActiveRequestModal(null)}
                  disabled={!!processingRequest}
                  className="p-2 text-yellow-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Organizer Profile Details (Crisp Rectangular Cards) */}
              <div className="space-y-4">
                <div className="bg-[#1c050a] border border-yellow-400/30 p-4 rounded-none">
                  <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Applicant Contact & Profile
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-red-200/70 uppercase text-[10px] block font-bold">Contact Person</span>
                      <span className="text-white font-medium text-sm">{activeRequestModal.request.contactName}</span>
                    </div>
                    <div>
                      <span className="text-red-200/70 uppercase text-[10px] block font-bold">Email Address</span>
                      <span className="text-white font-mono text-sm break-all">{activeRequestModal.request.email}</span>
                    </div>
                    <div>
                      <span className="text-red-200/70 uppercase text-[10px] block font-bold">Phone Number</span>
                      <span className="text-white font-medium">{activeRequestModal.request.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-red-200/70 uppercase text-[10px] block font-bold">Event Experience / Portfolio</span>
                      <span className="text-white">{activeRequestModal.request.eventTypes || 'None specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Accompanying Event Submission */}
                {activeRequestModal.request.eventDetails && (
                  <div className="bg-[#1c050a] border border-yellow-400/30 p-4 rounded-none">
                    <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Submitted Event Details
                    </h4>
                    <p className="text-base font-bold text-white font-[family-name:var(--font-marcellus)] mb-1">
                      {activeRequestModal.request.eventDetails.title}
                    </p>
                    <p className="text-xs text-red-200/80 mb-3 line-clamp-3">
                      {activeRequestModal.request.eventDetails.description || 'No description provided.'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-[#120408] p-2 border border-yellow-400/20">
                        <span className="text-[10px] text-yellow-400/80 block uppercase font-bold">Date</span>
                        <span className="text-white font-medium">
                          {new Date(activeRequestModal.request.eventDetails.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="bg-[#120408] p-2 border border-yellow-400/20">
                        <span className="text-[10px] text-yellow-400/80 block uppercase font-bold">Venue</span>
                        <span className="text-white font-medium truncate block">
                          {activeRequestModal.request.eventDetails.venue || activeRequestModal.request.eventDetails.venueType || 'TBA'}
                        </span>
                      </div>
                      <div className="bg-[#120408] p-2 border border-yellow-400/20 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-yellow-400/80 block uppercase font-bold">Admission</span>
                        <span className="text-white font-medium">
                          {activeRequestModal.request.eventDetails.price > 0
                            ? `₹${activeRequestModal.request.eventDetails.price}`
                            : 'Free Entry'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode Selector & Input */}
                {activeRequestModal.action === 'reject' ? (
                  <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-none">
                    <label className="block text-xs font-bold uppercase text-red-200 tracking-wider mb-2">
                      Reason for Rejection (will be emailed to the applicant):
                    </label>
                    <textarea
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder="e.g. Incomplete verification details or duplicate event submission..."
                      rows={3}
                      className="w-full bg-[#120408] border border-red-500/40 p-3 text-sm text-white placeholder-red-300/40 outline-none focus:border-yellow-400 rounded-none resize-none"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span>
                      Accepting will automatically generate the organizer portal login, publish the event to the Festora catalog, and send credentials to {activeRequestModal.request.email}.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons in Crimson Red & Yellow */}
              <div className="mt-6 pt-4 border-t border-yellow-400/30 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setActiveRequestModal(null)}
                  disabled={!!processingRequest}
                  className="px-5 py-3.5 bg-[#1c050a] border border-yellow-400/30 text-red-200 hover:text-white uppercase tracking-widest text-xs font-bold transition-all rounded-none"
                >
                  Cancel
                </button>

                {activeRequestModal.action === 'approve' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveRequestModal({ ...activeRequestModal, action: 'reject' })}
                      disabled={!!processingRequest}
                      className="px-5 py-3.5 bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-200 uppercase tracking-widest text-xs font-bold transition-all rounded-none"
                    >
                      Switch to Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => executeRequestAction(activeRequestModal.request, 'approve')}
                      disabled={!!processingRequest}
                      className="flex-1 py-3.5 px-6 bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold uppercase tracking-widest text-xs border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50 rounded-none"
                    >
                      {processingRequest === activeRequestModal.request.id ? (
                        <>
                          <Spinner inline />
                          <span>Accepting & Publishing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-yellow-300" />
                          <span>Accept & Publish Request</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveRequestModal({ ...activeRequestModal, action: 'approve' })}
                      disabled={!!processingRequest}
                      className="px-5 py-3.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 uppercase tracking-widest text-xs font-bold transition-all rounded-none"
                    >
                      Switch to Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => executeRequestAction(activeRequestModal.request, 'reject', rejectionReasonInput)}
                      disabled={!!processingRequest}
                      className="flex-1 py-3.5 px-6 bg-red-800 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs border border-red-400 flex items-center justify-center gap-2 transition-all disabled:opacity-50 rounded-none"
                    >
                      {processingRequest === activeRequestModal.request.id ? (
                        <>
                          <Spinner inline />
                          <span>Processing Rejection...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Confirm Rejection</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outcome Confirmation Profile Card Modal (Rectangular, Crimson Red & Yellow, Zero alerts!) */}
      <AnimatePresence>
        {requestActionOutcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setRequestActionOutcome(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#120408] border-2 border-yellow-400 p-6 sm:p-8 rounded-none sm:rounded-sm shadow-[0_0_60px_rgba(220,38,38,0.5)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Art-Deco Yellow Corner Brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400" />

              <div className="text-center">
                {requestActionOutcome.success ? (
                  <div className="w-16 h-16 bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center mx-auto mb-4 rounded-none shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                    <CheckCircle className="w-8 h-8 text-yellow-300" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4 rounded-none">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-1">
                  {requestActionOutcome.success
                    ? (requestActionOutcome.action === 'approve' ? 'Application Approved & Live!' : 'Application Rejected')
                    : 'Action Failed'}
                </h3>
                <p className="text-sm text-yellow-300 font-semibold mb-6">
                  {requestActionOutcome.organizationName}
                </p>

                {requestActionOutcome.success && requestActionOutcome.action === 'approve' && (
                  <div className="bg-[#1c050a] border border-yellow-400/40 p-4 rounded-none text-left mb-6 space-y-2">
                    <p className="text-xs uppercase tracking-widest text-yellow-400 font-bold mb-3 border-b border-yellow-400/20 pb-1">
                      Generated Organizer Credentials
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-red-200">Username:</span>
                      <code className="bg-[#120408] border border-yellow-400/30 px-3 py-1 font-mono text-yellow-300 font-bold">
                        {requestActionOutcome.username}
                      </code>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-red-200">Password:</span>
                      <code className="bg-[#120408] border border-yellow-400/30 px-3 py-1 font-mono text-yellow-300 font-bold">
                        {requestActionOutcome.password}
                      </code>
                    </div>
                    <div className="pt-2 border-t border-yellow-400/20 text-[11px] text-yellow-300/80">
                      ✓ Email confirmation with access link sent to {requestActionOutcome.email}.
                    </div>
                  </div>
                )}

                {requestActionOutcome.error && (
                  <div className="bg-red-950/40 border border-red-500/50 p-4 text-xs text-red-300 mb-6 text-left rounded-none">
                    {requestActionOutcome.error}
                  </div>
                )}

                <button
                  onClick={() => setRequestActionOutcome(null)}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold uppercase tracking-widest text-xs border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:brightness-110 transition-all rounded-none"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

