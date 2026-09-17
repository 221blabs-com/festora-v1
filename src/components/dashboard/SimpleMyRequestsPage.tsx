'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { Calendar, Building2, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SimpleEventRequest {
  id: string;
  eventTitle: string;
  organizationName: string;
  contactEmail: string;
  eventDescription: string;
  preferredDate: string;
  eventType: string;
  estimatedAttendees: number;
  additionalNotes: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    color: 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-500 border border-green-500/20',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-500 border border-red-500/20',
    icon: XCircle,
  },
};

export default function SimpleMyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SimpleEventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/users/me/simple-requests', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch requests');
        }

        const data = await response.json();
        setRequests(data.requests || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setError('Failed to load your requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysSince = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-[family-name:var(--font-josefin)]">
        <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-subtle)] relative">
          
          
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-[var(--bg-card-hover)] rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-[var(--bg-card-hover)] rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-[family-name:var(--font-josefin)]">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] relative p-6">
        
        

        <div className="border-b border-[var(--border-subtle)] pb-6 mb-6">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
            My Event Requests
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Track the status of your submitted event requests
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-12 relative">
              <AlertCircle className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">
                No requests yet
              </h3>
              <p className="text-[var(--fg-muted)] mb-4">
                You haven&apos;t submitted any event requests yet.
              </p>
              <Link
                href="/events/create/"
                className="inline-flex items-center px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] font-medium transition-colors uppercase tracking-widest text-xs font-bold"
              >
                Submit Your First Request
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const status = statusConfig[request.status];
                const StatusIcon = status.icon;

                return (
                  <div key={request.id} className="border border-[var(--border-subtle)] p-6 bg-[var(--bg)] hover:bg-[var(--bg-card-hover)] transition-colors relative group">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--gold)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--gold)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-1 uppercase tracking-wide group-hover:text-[var(--primary)] transition-colors">
                          {request.eventTitle}
                        </h3>
                        <div className="flex items-center space-x-4 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4 text-[var(--gold)]" />
                            <span>{request.organizationName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="capitalize">{request.eventType}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-[var(--gold)]" />
                            <span>{request.estimatedAttendees} attendees</span>
                          </div>
                        </div>
                      </div>

                      <span className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-widest border ${
                        request.status === 'approved' ? 'border-green-500/20 text-green-500 bg-green-500/10' :
                        request.status === 'rejected' ? 'border-red-500/20 text-red-500 bg-red-500/10' :
                        'border-[var(--gold)]/20 text-[var(--gold)] bg-[var(--gold)]/10'
                      }`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {status.label}
                      </span>
                    </div>

                    <p className="text-[var(--fg-muted)] mb-4 line-clamp-2 text-sm leading-relaxed font-light">
                      {request.eventDescription}
                    </p>

                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                      <div className="flex items-center space-x-4">
                        {request.preferredDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-[var(--gold)]" />
                            <span>Preferred: {formatDate(request.preferredDate)}</span>
                          </div>
                        )}
                      </div>
                      <span>Submitted {getDaysSince(request.submittedAt)}</span>
                    </div>

                    {request.additionalNotes && (
                      <div className="mt-4 p-3 bg-[var(--bg-card)] border-l-2 border-[var(--primary)]">
                        <p className="text-xs text-[var(--fg-muted)]">
                          <strong className="text-[var(--fg)] uppercase tracking-wide">Additional Notes:</strong> {request.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
