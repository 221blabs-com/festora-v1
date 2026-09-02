'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  Plus,
  Filter,
  Search,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface EventRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  eventDetails: {
    title: string;
    subtitle?: string;
    organizationName: string;
    eventType: string;
    categories: string[];
    dateTime: {
      startDate: string;
      endDate: string;
      timezone: string;
    };
    venue: {
      name: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      address: any;
    };
    pricing: {
      isFree: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tiers: any[];
    };
    media: {
      coverImageUrl?: string;
    };
    description?: string; // Added description to interface
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

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    color: 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20',
    icon: Clock,
    description: 'Your request is being reviewed by our team'
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-500 border border-green-500/20',
    icon: CheckCircle,
    description: 'Your event has been approved and is now live'
  },
  rejected: {
    label: 'Not Approved',
    color: 'bg-red-500/10 text-red-500 border border-red-500/20',
    icon: XCircle,
    description: 'Your request needs some changes'
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
    icon: AlertCircle,
    description: 'Please review the feedback and resubmit'
  }
};

export default function MyRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [stats, setStats] = useState<RequestStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch user's requests
  useEffect(() => {
    async function fetchRequests() {
      if (!user) return;
      
      try {
        setLoading(true);
        // Using correct API endpoint that handles both admin fetching all and user fetching own
        const response = await fetch('/api/simple-event-request?createdBy=' + user.uid);
        
        if (!response.ok) {
          throw new Error('Failed to fetch requests');
        }

        const data = await response.json();
        setRequests(data.requests || []);
        const newStats = {
          total: data.requests?.length || 0,
          pending: data.requests?.filter((request: EventRequest) => request.status === 'pending').length || 0,
          approved: data.requests?.filter((request: EventRequest) => request.status === 'approved').length || 0,
          rejected: data.requests?.filter((request: EventRequest) => request.status === 'rejected').length || 0,
        };
        setStats(newStats);
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [user]);

  // Filter requests based on active filter and search term
  const filteredRequests = requests.filter(request => {
    const matchesFilter = activeFilter === 'all' || request.status === activeFilter;
    const matchesSearch = !searchTerm ||
      request.eventDetails.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.eventDetails.organizationName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate days since submission
  const getDaysSince = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-[var(--fg-muted)] font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm">Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] relative overflow-hidden font-[family-name:var(--font-josefin)]">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
               <div>
                  <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">
                     My <span className="text-[var(--primary)]">Requests</span>
                  </h1>
                  <p className="text-[var(--fg-muted)]">
                     Track and manage your submitted event requests
                  </p>
               </div>
               <button
                  onClick={() => router.push('/events/create')}
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] hover:shadow-[0_0_20px_var(--primary-glow)] uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center gap-2"
               >
                  <Plus className="w-4 h-4" />
                  <span>New Request</span>
               </button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
             {[
                { label: 'Total Requests', value: stats.total, color: 'border-[var(--primary)]', text: 'text-[var(--fg)]' },
                { label: 'Pending', value: stats.pending, color: 'border-[var(--gold)]', text: 'text-[var(--gold)]' },
                { label: 'Approved', value: stats.approved, color: 'border-green-500', text: 'text-green-500' },
                { label: 'Rejected', value: stats.rejected, color: 'border-red-500', text: 'text-red-500' }
             ].map((stat, idx) => (
                <div key={idx} className={`bg-[var(--bg-card)] border ${stat.color} p-4 text-center relative`}>


                   <h3 className={`text-2xl font-bold font-[family-name:var(--font-marcellus)] ${stat.text}`}>{stat.value}</h3>
                   <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--fg-muted)] mt-1">{stat.label}</p>
                </div>
             ))}
          </div>
          
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[var(--bg-card)] p-4 border border-[var(--border-subtle)]">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
                <input
                   type="text"
                   placeholder="SEARCH REQUESTS..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border-b border-[var(--border-subtle)] text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors placeholder-[var(--fg-muted)]/50 uppercase tracking-wider"
                />
             </div>
             <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {['all', 'pending', 'approved', 'rejected'].map((filter) => (
                   <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                         activeFilter === filter
                            ? 'bg-[var(--primary)] text-[var(--fg)] border-[var(--primary)]'
                            : 'bg-transparent text-[var(--fg-muted)] border-[var(--border-subtle)] hover:text-[var(--fg)] hover:border-[var(--primary)]'
                      }`}
                   >
                      {filter}
                   </button>
                ))}
             </div>
          </div>
          
          {/* Request List */}
          {loading ? (
             <div className="text-center py-12">
                <Spinner />
                <p className="text-[var(--fg-muted)]">Loading your requests...</p>
             </div>
          ) : filteredRequests.length === 0 ? (
             <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-12 text-center relative">



                <div className="w-16 h-16 rounded-full border border-[var(--fg-muted)] flex items-center justify-center mx-auto mb-6 opacity-30 shadow-[0_0_10px_var(--fg-muted)]">
                   <Filter className="w-8 h-8 text-[var(--fg-muted)]" />
                </div>
                <h3 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">
                   No requests found
                </h3>
                <p className="text-[var(--fg-muted)] mb-6">
                   {searchTerm || activeFilter !== 'all' ? 'Try adjusting your filters' : 'You haven\'t submitted any requests yet'}
                </p>
                {!searchTerm && activeFilter === 'all' && (
                   <button
                      onClick={() => router.push('/events/create')}
                      className="inline-flex items-center justify-center px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] uppercase tracking-widest text-xs font-bold transition-all duration-300"
                   >
                      Create Event
                   </button>
                )}
             </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const status = statusConfig[request.status];
                const StatusIcon = status.icon;

                return (
                  <motion.div 
                     key={request.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 hover:shadow-[0_0_15px_var(--primary-glow)] transition-all group relative"
                  >
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                           <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide group-hover:text-[var(--primary)] transition-colors">
                             {request.eventDetails.title}
                           </h3>
                           <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold w-fit ${status.color}`}>
                             <StatusIcon className="w-3 h-3 mr-1" />
                             {status.label}
                           </span>
                        </div>
                        
                        <div className="flex flex-wrap text-xs text-[var(--fg-muted)] gap-4 mt-2">
                           <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1 text-[var(--gold)]" />
                              {formatDate(request.eventDetails.dateTime.startDate)}
                           </span>
                           <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1 text-[var(--gold)]" />
                              {request.eventDetails.venue.name}
                           </span>
                           <span className="opacity-70">
                              submitted {getDaysSince(request.submittedAt)}
                           </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 text-[var(--fg-muted)] hover:text-[var(--primary)] border border-transparent hover:border-[var(--primary)] transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-[var(--fg-muted)] line-clamp-2 mb-3 font-light leading-relaxed">
                       {request.eventDetails.description || request.eventDetails.subtitle || 'No description provided.'}
                    </p>
                    
                    {request.adminReview?.reviewNotes && (status.label === 'Rejected' || status.label === 'Changes Requested') && (
                       <div className="mt-3 p-3 bg-[var(--bg)] border-l-2 border-[var(--primary)] text-xs text-[var(--fg-muted)] italic">
                          &quot;{request.adminReview.reviewNotes}&quot; - Admin Team
                       </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Detail Modal would go here - keeping succinct for now */}
    </div>
  );
}
