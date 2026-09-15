'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  Calendar,
  Eye,
  Download,
  BarChart3,
  ArrowUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import QRScanner from './QRScanner';

interface Event {
  id: string;
  title: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  organizerName: string;
  ticketPrice?: number;
}

interface AnalyticsDashboardProps {
  event: Event;
}

interface Participant {
  id: string;
  teamName: string;
  member1Name: string;
  member1Email: string;
  member1Phone?: string; // added
  member1RollNumber?: string; // added
  member1Year?: string; // added
  member1Section?: string; // added
  member2Name: string | null;
  member2Email: string | null;
  member2Phone?: string | null; // added
  member2RollNumber?: string | null; // added
  member2Year?: string | null; // added
  member2Section?: string | null; // added
  member3Name: string | null;
  member3Email: string | null;
  member3Phone?: string | null; // added
  member3RollNumber?: string | null; // added
  member3Year?: string | null; // added
  member3Section?: string | null; // added
  member4Name: string | null;
  member4Email: string | null;
  member4Phone?: string | null; // added
  member4RollNumber?: string | null; // added
  member4Year?: string | null; // added
  member4Section?: string | null; // added
  registrationDate: string;
  status: string;
  checkedIn: boolean;
  paymentStatus: string;
  university: string;
  department: string;
  checkedInAt?: string;
  // Additional optional aggregate fields from API
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;
  isIndividualTicket?: boolean;
  // Optional teamInfo used in UI fallbacks
  teamInfo?: {
    memberPhone?: string;
    memberRollNumber?: string;
    memberYear?: string;
    memberSection?: string;
  };
  gender?: string;
  tshirtSize?: string;
  customAnswers?: Record<string, string>;
  // Dynamic members array for unlimited sizes
  dynamicMembers?: Array<{
    name: string;
    email: string;
    phone: string;
    rollNumber?: string;
    year?: string;
    department?: string;
    college?: string;
  }>;
}

interface Analytics {
  overview: {
    totalRegistrations: number;
    totalRevenue: number;
    avgTicketPrice: number;
    checkedInCount: number;
    checkedInRate: number;
  };
  dailyRegistrations: Array<{
    date: string;
    registrations: number;
  }>;
  registrationStatus: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  checkInStatus: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

// Helper: check if a participant looks like test/unknown data or hasn't paid
function isTestParticipant(p: Participant): boolean {
  // Never filter out college registrations
  if (p.dynamicMembers || (p.id && p.id.includes('HCISQ')) || (p.teamName && p.teamName.includes('-'))) {
    return false;
  }

  // Filter out unpaid participants first
  const paymentStatus = (p.paymentStatus || '').toLowerCase();
  if (paymentStatus && paymentStatus !== 'completed' && paymentStatus !== 'paid' && paymentStatus !== 'captured') {
    return true; // Not paid = filter out
  }

  const name = (p.member1Name || '').toLowerCase().trim();
  const rollNumber = p.member1RollNumber || p.teamInfo?.memberRollNumber || '';
  const year = p.member1Year || p.teamInfo?.memberYear || '';
  const department = (p.department || '').trim();
  const university = (p.university || '').trim();

  // If they have a valid roll number, they're real
  if (rollNumber && rollNumber !== '-' && rollNumber.length > 1) return false;

  // Obvious test/placeholder names
  if (name === 'unknown participant' || name === 'participant') return true;
  if (name === 'test' || name === 'test user' || name === 'asdf' || name === 'unknown') return true;

  // No roll number + no academic info = likely test
  const hasNoAcademicInfo = (!year || year === '-') &&
    (!department || department === 'Not specified' || department === '-') &&
    (!university || university === 'Not specified' || university === '-');

  // Short names (≤3 chars) with no academic info
  if (name.length <= 3 && hasNoAcademicInfo) return true;

  // Individual registrations with short random-looking names (no spaces) and no academic data
  if (p.teamName === 'Individual' && hasNoAcademicInfo) {
    if (name.length <= 8 && !name.includes(' ')) return true;
  }

  return false;
}

// Extract members from a participant record
function extractMembers(participant: Participant) {
  const members: Array<{
    name: string;
    email: string;
    phone: string;
    rollNumber: string;
    year: string;
    department: string;
    college: string;
    gender?: string;
    tshirtSize?: string;
    customAnswers?: Record<string, string>;
  }> = [];

  if (participant.member1Name) {
    members.push({
      name: participant.member1Name,
      email: participant.member1Email || '',
      phone: participant.member1Phone || participant.teamInfo?.memberPhone || '',
      rollNumber: participant.member1RollNumber || participant.teamInfo?.memberRollNumber || '',
      year: participant.member1Year || participant.teamInfo?.memberYear || '',
      department: participant.department || '',
      college: participant.university || '',
      gender: participant.gender || '',
      tshirtSize: participant.tshirtSize || '',
      customAnswers: participant.customAnswers || {}
    });
  }
  if (participant.member2Name) {
    members.push({
      name: participant.member2Name,
      email: participant.member2Email || '',
      phone: participant.member2Phone || '',
      rollNumber: participant.member2RollNumber || '',
      year: participant.member2Year || '',
      department: participant.department || '',
      college: participant.university || '',
      gender: participant.gender || '',
      tshirtSize: participant.tshirtSize || '',
      customAnswers: participant.customAnswers || {}
    });
  }
  if (participant.member3Name) {
    members.push({
      name: participant.member3Name,
      email: participant.member3Email || '',
      phone: participant.member3Phone || '',
      rollNumber: participant.member3RollNumber || '',
      year: participant.member3Year || '',
      department: participant.department || '',
      college: participant.university || '',
      gender: participant.gender || '',
      tshirtSize: participant.tshirtSize || '',
      customAnswers: participant.customAnswers || {}
    });
  }
  if (participant.member4Name) {
    members.push({
      name: participant.member4Name,
      email: participant.member4Email || '',
      phone: participant.member4Phone || '',
      rollNumber: participant.member4RollNumber || '',
      year: participant.member4Year || '',
      department: participant.department || '',
      college: participant.university || '',
      gender: participant.gender || '',
      tshirtSize: participant.tshirtSize || '',
      customAnswers: participant.customAnswers || {}
    });
  }
  
  if (participant.dynamicMembers && participant.dynamicMembers.length > 0) {
    const dynamicArray = participant.dynamicMembers.map(m => ({
      name: m.name,
      email: m.email,
      phone: m.phone,
      rollNumber: m.rollNumber || '',
      year: m.year || '',
      department: m.department || '',
      college: m.college || '',
      gender: participant.gender || '',
      tshirtSize: participant.tshirtSize || '',
      customAnswers: participant.customAnswers || {}
    }));
    members.push(...dynamicArray);
  }
  
  return members;
}

// Grouped participant list component
function ParticipantListGrouped({ participants, hasMore, onLoadMore, loadingMore }: { participants: Participant[], hasMore: boolean, onLoadMore: () => void, loadingMore: boolean }) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Filter out test/unknown participants
  const validParticipants = participants.filter(p => !isTestParticipant(p));

  // Group by team name
  const grouped = validParticipants.reduce<Record<string, Participant[]>>((acc, p) => {
    const key = p.teamName || 'Individual';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Separate teams from individuals
  const teamEntries = Object.entries(grouped).filter(([name]) => name !== 'Individual');
  const individualEntries = grouped['Individual'] || [];

  const totalMembers = validParticipants.reduce((total, p) => {
    return total + extractMembers(p).length;
  }, 0);

  const toggleTeam = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) next.delete(teamName);
      else next.add(teamName);
      return next;
    });
  };

  const expandAll = () => {
    const allTeams = new Set(teamEntries.map(([name]) => name));
    if (individualEntries.length > 0) allTeams.add('__individuals__');
    setExpandedTeams(allTeams);
  };

  const collapseAll = () => setExpandedTeams(new Set());

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">Participant List</h3>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            {totalMembers} participants across {teamEntries.length} team{teamEntries.length !== 1 ? 's' : ''}
            {individualEntries.length > 0 && ` + ${individualEntries.length} individual${individualEntries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs px-3 py-1.5 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--gold)] rounded transition-colors uppercase tracking-wider font-bold">
            Expand All
          </button>
          <button onClick={collapseAll} className="text-xs px-3 py-1.5 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--gold)] rounded transition-colors uppercase tracking-wider font-bold">
            Collapse All
          </button>
        </div>
      </div>

      {validParticipants.length === 0 ? (
        <div className="text-center py-12 text-[var(--fg-muted)]">
          No participant data available
        </div>
      ) : (
        <div className="space-y-3">
          {/* Team entries */}
          {teamEntries.map(([teamName, teamParticipants]) => {
            const isExpanded = expandedTeams.has(teamName);
            const allMembers = teamParticipants.flatMap(p => extractMembers(p).map(m => ({ ...m, participant: p })));
            const checkedIn = teamParticipants.some(p => p.checkedIn);
            const regDate = teamParticipants[0]?.registrationDate;

            return (
              <div key={teamName} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                {/* Team Header */}
                <button
                  onClick={() => toggleTeam(teamName)}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg)] hover:bg-[var(--bg-card-hover)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-[var(--gold)] flex items-center justify-center bg-[var(--bg-card)]">
                      <Users className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <div>
                      <span className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)]">{teamName}</span>
                      <span className="text-[var(--fg-muted)] text-xs ml-3">{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {checkedIn && <CheckCircle className="w-4 h-4 text-green-500" />}
                    <span className="text-xs text-[var(--fg-muted)]">{regDate ? new Date(regDate).toLocaleDateString('en-GB') : ''}</span>
                    <svg className={`w-4 h-4 text-[var(--fg-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {/* Expanded Members */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Name</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Email</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Phone</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Roll No.</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Year</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Dept</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">College</th>
                          <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Details / Custom</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMembers.map((member, idx) => (
                          <tr key={idx} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-card-hover)] transition-colors">
                            <td className="py-2.5 px-4 text-[var(--fg)]">{member.name}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.email}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.phone || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.rollNumber || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.year || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.department || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{member.college || '-'}</td>
                            <td className="py-2.5 px-4 text-xs text-[var(--fg-muted)]">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {member.gender && (
                                  <span className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[10px]">
                                    {member.gender}
                                  </span>
                                )}
                                {member.tshirtSize && (
                                  <span className="px-1.5 py-0.5 bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 rounded text-[10px] font-bold">
                                    Size: {member.tshirtSize}
                                  </span>
                                )}
                                {member.customAnswers && Object.entries(member.customAnswers).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/20 rounded text-[10px]">
                                    {v}
                                  </span>
                                ))}
                                {!member.gender && !member.tshirtSize && (!member.customAnswers || Object.keys(member.customAnswers).length === 0) && (
                                  <span>-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Individual entries */}
          {individualEntries.length > 0 && (
            <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTeam('__individuals__')}
                className="w-full flex items-center justify-between p-4 bg-[var(--bg)] hover:bg-[var(--bg-card-hover)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-[var(--primary)] flex items-center justify-center bg-[var(--bg-card)]">
                    <Users className="w-4 h-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)]">Individual Registrations</span>
                    <span className="text-[var(--fg-muted)] text-xs ml-3">{individualEntries.length} participant{individualEntries.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-[var(--fg-muted)] transition-transform ${expandedTeams.has('__individuals__') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {expandedTeams.has('__individuals__') && (
                <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Name</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Email</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Phone</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Roll No.</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Year</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Dept</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">College</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Details / Custom</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Date</th>
                        <th className="text-left py-2 px-4 font-medium text-[var(--gold)] text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {individualEntries.map((p) => {
                        const members = extractMembers(p);
                        return members.map((m, idx) => (
                          <tr key={`${p.id}-${idx}`} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-card-hover)] transition-colors">
                            <td className="py-2.5 px-4 text-[var(--fg)]">{m.name}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.email}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.phone || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.rollNumber || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.year || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.department || '-'}</td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{m.college || '-'}</td>
                            <td className="py-2.5 px-4 text-xs text-[var(--fg-muted)]">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {m.gender && (
                                  <span className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-[10px]">
                                    {m.gender}
                                  </span>
                                )}
                                {m.tshirtSize && (
                                  <span className="px-1.5 py-0.5 bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 rounded text-[10px] font-bold">
                                    Size: {m.tshirtSize}
                                  </span>
                                )}
                                {m.customAnswers && Object.entries(m.customAnswers).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/20 rounded text-[10px]">
                                    {v}
                                  </span>
                                ))}
                                {!m.gender && !m.tshirtSize && (!m.customAnswers || Object.keys(m.customAnswers).length === 0) && (
                                  <span>-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-[var(--fg-muted)]">{new Date(p.registrationDate).toLocaleDateString('en-GB')}</td>
                            <td className="py-2.5 px-4">
                              {p.checkedIn ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-[var(--fg-muted)]" />}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)] hover:text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 font-bold uppercase tracking-wider text-sm"
              >
                {loadingMore ? (
                  <>
                    <Spinner /> Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({ event }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'scanner' | 'checkedin'>('overview');

  const participantCache = useRef<Map<string, { participants: Participant[]; analytics: Analytics; timestamp: number }>>(new Map());
  const CLIENT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes in ms

  useEffect(() => {
    loadRealData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const loadRealData = async (forceRefresh = false) => {
    // Check client-side memory cache first to save reads
    if (!forceRefresh) {
      const cached = participantCache.current.get(event.id);
      if (cached && (Date.now() - cached.timestamp < CLIENT_CACHE_TTL)) {
        setParticipants(cached.participants);
        setAnalytics(cached.analytics);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      // First, set basic analytics directly from the event data for the overview
      const basicAnalytics = generateBasicAnalytics(event);
      setAnalytics(basicAnalytics);

      // Fetch first page of participants from Firebase
      const response = await fetch(`/api/participants/${event.id}?limit=50`);
      if (response.ok) {
        const data = await response.json();
        const confirmedParticipants = (data.participants || []).filter((p: Participant) => !isTestParticipant(p));

        setParticipants(confirmedParticipants);
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);

        // Enhance analytics with specific details from the fetched participants
        const realAnalytics = generateRealAnalytics(
          event, 
          confirmedParticipants, 
          basicAnalytics,
          data.totalRegistrations,
          data.totalCheckedIn
        );
        setAnalytics(realAnalytics);

        // Store in client cache
        participantCache.current.set(event.id, {
          participants: confirmedParticipants,
          analytics: realAnalytics,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error loading real data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreParticipants = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/participants/${event.id}?limit=50&cursor=${encodeURIComponent(nextCursor)}`);
      if (response.ok) {
        const data = await response.json();
        const newParticipants = (data.participants || []).filter((p: Participant) => !isTestParticipant(p));
        
        setParticipants(prev => {
          const combined = [...prev, ...newParticipants];
          // Remove duplicates
          return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        });
        
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);

        // Update daily registrations/checkins based on new data
        if (analytics) {
          setAnalytics(prev => {
            if (!prev) return prev;
            return generateRealAnalytics(
              event, 
              [...participants, ...newParticipants], 
              prev,
              data.totalRegistrations,
              data.totalCheckedIn
            );
          });
        }
      }
    } catch (error) {
      console.error('Error loading more participants:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Calculate actual number of teams
  const calculateTeamCount = (participants: Participant[]): number => {
    const uniqueTeams = new Set();
    participants.forEach(participant => {
      // For individual registrations, each participant is their own "team"
      if (participant.teamName === 'Individual') {
        uniqueTeams.add(`individual_${participant.id}`);
      } else {
        // For team registrations, use the team name to count unique teams
        uniqueTeams.add(participant.teamName);
      }
    });
    return uniqueTeams.size;
  };

  const generateRealAnalytics = (event: Event, participants: Participant[], baseAnalytics: Analytics, totalRegistrationsFromApi?: number, totalCheckedInFromApi?: number): Analytics => {
    // We use the count from the API if available, else fallback to local check
    const checkedInCount = totalCheckedInFromApi !== undefined ? totalCheckedInFromApi : participants.filter(p => p.checkedIn).length;
    // We base the rate on total registered tickets from event or API
    const totalCount = totalRegistrationsFromApi || event.ticketsSold || participants.length;
    const checkedInRate = totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0;

    // Registration dates for daily breakdown from fetched participants
    const registrationsByDate: { [key: string]: number } = {};
    participants.forEach(participant => {
      const date = new Date(participant.registrationDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
      registrationsByDate[date] = (registrationsByDate[date] || 0) + 1;
    });

    const dailyRegistrations = Object.entries(registrationsByDate)
      .map(([date, count]) => ({ date, registrations: count }))
      .sort((a, b) => new Date(a.date + ', 2024').getTime() - new Date(b.date + ', 2024').getTime());

    // Registration status breakdown
    const activeCount = participants.filter(p => p.status === 'active' || !p.status).length;
    const cancelledCount = participants.filter(p => p.status === 'cancelled').length;
    
    // Extrapolate for remaining tickets if event.ticketsSold is greater than what we've fetched
    const unmappedActive = Math.max(0, event.ticketsSold - participants.length);

    const registrationStatus = [
      { name: 'Active', value: activeCount + unmappedActive, color: '#C9A84C' },
      { name: 'Cancelled', value: cancelledCount, color: '#C8102E' }
    ].filter(item => item.value > 0);

    // Check-in status
    const checkInStatus = [
      { name: 'Checked In', value: checkedInCount, color: '#C9A84C' },
      { name: 'Not Checked In', value: totalCount - checkedInCount, color: '#888880' }
    ].filter(item => item.value > 0);

    // Use actual fetched participant count if available
    const trueTotalRegistrations = (totalRegistrationsFromApi !== undefined && totalRegistrationsFromApi > 0)
      ? totalRegistrationsFromApi 
      : (participants.length > 0 ? participants.length : (event.ticketsSold || 0));

    return {
      overview: {
        ...baseAnalytics.overview,
        totalRegistrations: trueTotalRegistrations,
        checkedInCount,
        checkedInRate: Math.round(checkedInRate)
      },
      dailyRegistrations,
      registrationStatus,
      checkInStatus
    };
  };

  const generateBasicAnalytics = (event: Event): Analytics => {
    // Only use real data from Firebase, no fallbacks or calculations
    const actualRevenue = event.revenue || 0;
    const actualTicketsSold = event.ticketsSold || 0;

    return {
      overview: {
        totalRegistrations: actualTicketsSold,
        totalRevenue: actualRevenue,
        avgTicketPrice: (actualTicketsSold > 0 && actualRevenue > 0) ? Math.round(actualRevenue / actualTicketsSold) : 0,
        checkedInCount: 0,
        checkedInRate: 0
      },
      dailyRegistrations: [],
      registrationStatus: actualTicketsSold > 0 ? [
        { name: 'Registered', value: actualTicketsSold, color: '#C9A84C' }
      ] : [],
      checkInStatus: actualTicketsSold > 0 ? [
        { name: 'Not Checked In', value: actualTicketsSold, color: '#888880' }
      ] : []
    };
  };

  const exportToCSV = async () => {
    // If we have more participants to load, we should tell the user
    // or we can fetch all by calling the API with export=true
    setLoading(true);
    let allParticipants = participants;
    
    if (hasMore) {
      try {
        const response = await fetch(`/api/participants/${event.id}?export=true`);
        if (response.ok) {
          const data = await response.json();
          allParticipants = (data.participants || []).filter((p: Participant) => !isTestParticipant(p));
        }
      } catch (e) {
        console.error("Failed to export all", e);
      }
    }
    setLoading(false);

    if (allParticipants.length === 0) {
      alert('No participant data available to export');
      return;
    }

    // Collect all distinct custom field keys from members across all participants
    const allCustomKeysSet = new Set<string>();
    const allMembersList: Array<{ participant: Participant; member: ReturnType<typeof extractMembers>[0] }> = [];

    allParticipants.forEach(p => {
      const extracted = extractMembers(p);
      extracted.forEach(m => {
        allMembersList.push({ participant: p, member: m });
        if (m.customAnswers) {
          Object.keys(m.customAnswers).forEach(k => allCustomKeysSet.add(k));
        }
      });
    });

    const customKeys = Array.from(allCustomKeysSet);

    // Define CSV headers - with Gender, T-Shirt Size and custom fields
    const headers = [
      'Team Name',
      'Member Name',
      'Email',
      'Phone',
      'Roll Number',
      'Year',
      'Department',
      'College/University',
      'Gender',
      'T-Shirt Size',
      ...customKeys.map(k => `Custom: ${k}`),
      'Registration Date',
      'Status',
      'Check-in'
    ];

    // Convert participants to CSV format with individual member rows
    const csvRows: string[][] = [];
    allMembersList.forEach(({ participant, member }) => {
      const row = [
        `"${(participant.teamName || 'Individual').replace(/"/g, '""')}"`,
        `"${(member.name || '').replace(/"/g, '""')}"`,
        `"${(member.email || '').replace(/"/g, '""')}"`,
        `"${(member.phone || '').replace(/"/g, '""')}"`,
        `"${(member.rollNumber || '').replace(/"/g, '""')}"`,
        `"${(member.year || '').replace(/"/g, '""')}"`,
        `"${(member.department || '').replace(/"/g, '""')}"`,
        `"${(member.college || '').replace(/"/g, '""')}"`,
        `"${(member.gender || '').replace(/"/g, '""')}"`,
        `"${(member.tshirtSize || '').replace(/"/g, '""')}"`,
        ...customKeys.map(k => `"${(member.customAnswers?.[k] || '').replace(/"/g, '""')}"`),
        `"${new Date(participant.registrationDate).toLocaleDateString('en-GB')}"`,
        `"${participant.status || 'confirmed'}"`,
        `"${participant.checkedIn ? 'Yes' : 'No'}"`
      ];
      csvRows.push(row);
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_participants.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCheckIn = (participantId: string) => {
    // Update the participants list with the newly checked-in participant
    setParticipants(prevParticipants =>
      prevParticipants.map(p =>
        p.id === participantId
          ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() }
          : p
      )
    );

    // Refresh analytics to reflect the new check-in
    if (analytics) {
      const updatedAnalytics = generateRealAnalytics(event, participants.map(p =>
        p.id === participantId ? { ...p, checkedIn: true } : p
      ), analytics);
      setAnalytics(updatedAnalytics);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const exportCheckedInCSV = async () => {
    const checkedInParticipants = participants.filter(p => p.checkedIn);

    if (checkedInParticipants.length === 0) {
      alert('No checked-in participants to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Team Name',
      'Member 1 Name',
      'Member 1 Email',
      'Member 2 Name',
      'Member 2 Email',
      'Member 3 Name',
      'Member 3 Email',
      'Member 4 Name',
      'Member 4 Email',
      'Registration Date',
      'Check-in Date',
      'Status',
      'University',
      'Department'
    ];

    // Convert checked-in participants to CSV format
    const csvContent = [
      headers.join(','),
      ...checkedInParticipants.map(participant => [
        `"${participant.teamName}"`,
        participant.member1Name,
        participant.member1Email,
        participant.member2Name || '',
        participant.member2Email || '',
        participant.member3Name || '',
        participant.member3Email || '',
        participant.member4Name || '',
        participant.member4Email || '',
        new Date(participant.registrationDate).toLocaleDateString('en-GB'),
        participant.checkedInAt ? new Date(participant.checkedInAt).toLocaleDateString('en-GB') : 'N/A',
        participant.status,
        participant.university,
        participant.department || ''
      ].join(','))
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_checked_in.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Spinner />
          <p className="text-[var(--fg-muted)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-4" />
        <p className="text-[var(--fg-muted)]">Failed to load analytics</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'scanner', label: 'QR Scanner', icon: Eye },
    { id: 'checkedin', label: 'Checked In', icon: CheckCircle }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Event Info Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)]">{event.title}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-[var(--fg-muted)]">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[var(--gold)]" />
                <span>{new Date(event.date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-[var(--primary-light)]" />
                <span>{analytics.overview.totalRegistrations} / {event.totalTickets} registered</span>
              </div>
              {event.revenue > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-[var(--gold)]" />
                  <span>{formatRevenue(event.revenue)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <button
              onClick={exportToCSV}
              disabled={participants.length === 0}
              className="flex items-center gap-2 px-3 py-2 md:px-4 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] transition-colors disabled:bg-[var(--fg-muted)] disabled:cursor-not-allowed text-sm md:text-base w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV ({calculateTeamCount(participants)})</span>
              <span className="sm:hidden">Export ({calculateTeamCount(participants)})</span>
            </button> 

            <div className={`px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-medium w-full sm:w-auto text-center border ${
              event.status === 'upcoming' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
              event.status === 'ongoing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
              'bg-gray-500/10 text-gray-500 border-gray-500/20'
            }`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[var(--bg)] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(analytics.overview.totalRegistrations / event.totalTickets) * 100}%` }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl">
              <Users className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <ArrowUp className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-1">
            {analytics.overview.totalRegistrations.toLocaleString()}
          </div>
          <div className="text-sm text-[var(--fg-muted)]">Total Participants</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-[var(--gold)]/10 p-2.5 rounded-xl">
              <Users className="w-5 h-5 text-[var(--gold)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-1">
            {participants.length > 0 ? calculateTeamCount(participants).toLocaleString() : analytics.overview.totalRegistrations.toLocaleString()}
          </div>
          <div className="text-sm text-[var(--fg-muted)]">Total Teams</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[var(--primary)]/10 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <ArrowUp className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-1">
            {analytics.overview.checkedInCount}
          </div>
          <div className="text-sm text-[var(--fg-muted)]">Checked In ({analytics.overview.checkedInRate}%)</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[var(--gold)]/10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <ArrowUp className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-1">
            {formatRevenue(analytics.overview.totalRevenue)}
          </div>
          <div className="text-sm text-[var(--fg-muted)]">Total Revenue</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[var(--primary)]/10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-[var(--primary)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] mb-1">
            {formatRevenue(analytics.overview.avgTicketPrice)}
          </div>
          <div className="text-sm text-[var(--fg-muted)]">Avg. Ticket Price</div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Registrations Chart */}
            {analytics.dailyRegistrations.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)]">Registration Timeline</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyRegistrations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="date" stroke="var(--fg-muted)" />
                      <YAxis stroke="var(--fg-muted)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--fg)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="registrations"
                        stroke="#C8102E"
                        strokeWidth={2}
                        dot={{ fill: '#C8102E', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#C8102E', strokeWidth: 2, fill: '#E8294A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Status Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Status */}
              {analytics.registrationStatus.length > 1 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)]">Registration Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.registrationStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {analytics.registrationStatus.map((entry, index) => (
                            <Cell key={`status-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Check-in Status */}
              {analytics.checkInStatus.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)]">Check-in Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.checkInStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {analytics.checkInStatus.map((entry, index) => (
                            <Cell key={`checkin-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <ParticipantListGrouped participants={participants} hasMore={hasMore} onLoadMore={loadMoreParticipants} loadingMore={loadingMore} />
        )}

        {activeTab === 'scanner' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6">
            {/* QR Code Scanner Component - Container adapts to content */}
            <QRScanner onCheckIn={handleCheckIn} eventId={event.id} />
          </div>
        )}

        {activeTab === 'checkedin' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">Checked In Participants</h3>
              <div className="text-sm text-[var(--fg-muted)]">
                {participants.filter(p => p.checkedIn).length} checked in
              </div>
            </div>

            {participants.filter(p => p.checkedIn).length === 0 ? (
              <div className="text-center py-12 text-[var(--fg-muted)]">
                No participants have checked in yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Team Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 1 Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 1 Email</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 2 Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 2 Email</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 3 Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 3 Email</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 4 Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Member 4 Email</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Registration Date</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--gold)]">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.filter(p => p.checkedIn).map((participant) => (
                      <tr key={participant.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-3 px-4 text-[var(--fg)]">{participant.teamName}</td>
                        <td className="py-3 px-4 text-[var(--fg)]">{participant.member1Name}</td>
                        <td className="py-3 px-4 text-[var(--fg-muted)]">{participant.member1Email}</td>
                        <td className="py-3 px-4 text-[var(--fg)]">{participant.member2Name || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg-muted)]">{participant.member2Email || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg)]">{participant.member3Name || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg-muted)]">{participant.member3Email || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg)]">{participant.member4Name || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg-muted)]">{participant.member4Email || '-'}</td>
                        <td className="py-3 px-4 text-[var(--fg-muted)]">
                          {new Date(participant.registrationDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            participant.status === 'active' || !participant.status
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {participant.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {participant.checkedIn ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[var(--fg-muted)]" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
