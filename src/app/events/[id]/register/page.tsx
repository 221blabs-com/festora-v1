'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useAuth } from '@/contexts/auth-context';

interface TeamMember {
  id: string;
  name: string;
  mobile: string;
}

interface EventRegistration {
  id: string;
  category: string;
  sportName: string;
  teamName: string;
  captainName: string;
  captainMobile: string;
  captainEmail: string;
  teamMembers: TeamMember[];
}

const SPORT_OPTIONS = {
  Quiz: ['Quiz Competition'],
  Sports: [
    'Cricket (Men)',
    'Kabaddi (Men)',
    'Table Tennis (Men Doubles)',
    'Chess (Men)',
    'Carroms (Men Doubles)',
    'Throwball (Women)',
    'Tennikoit (Women)',
    'Table Tennis (Women Doubles)',
    'Chess (Women)',
    'Carroms (Women Doubles)',
    '100 Metres Sprint',
    'Shot Put',
    'Long Jump'
  ]
};

export default function CollegeRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const isTargetEvent = params?.id === 'hyderabad-city-inter-college-sports-quiz-competitions-2026';

  useEffect(() => {
    if (!isTargetEvent && params?.id) {
      router.push(`/events/${params.id}`);
    }
  }, [isTargetEvent, params?.id, router]);

  const [collegeName, setCollegeName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorMobile, setCoordinatorMobile] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  
  const [events, setEvents] = useState<EventRegistration[]>([
    {
      id: Date.now().toString(),
      category: 'Sports',
      sportName: '',
      teamName: '',
      captainName: '',
      captainMobile: '',
      captainEmail: '',
      teamMembers: []
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [error, setError] = useState('');

  if (!isTargetEvent) {
    return null;
  }

  const addEvent = () => {
    setEvents([...events, {
      id: Date.now().toString(),
      category: 'Sports',
      sportName: '',
      teamName: '',
      captainName: '',
      captainMobile: '',
      captainEmail: '',
      teamMembers: []
    }]);
  };

  const removeEvent = (id: string) => {
    if (events.length > 1) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const updateEvent = (id: string, field: keyof EventRegistration, value: any) => {
    setEvents(events.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        // Reset sport name if category changes
        if (field === 'category') {
          updated.sportName = '';
        }
        return updated;
      }
      return e;
    }));
  };

  const addTeamMember = (eventId: string) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          teamMembers: [...e.teamMembers, { id: Date.now().toString(), name: '', mobile: '' }]
        };
      }
      return e;
    }));
  };

  const removeTeamMember = (eventId: string, memberId: string) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          teamMembers: e.teamMembers.filter(m => m.id !== memberId)
        };
      }
      return e;
    }));
  };

  const updateTeamMember = (eventId: string, memberId: string, field: keyof TeamMember, value: string) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          teamMembers: e.teamMembers.map(m => m.id === memberId ? { ...m, [field]: value } : m)
        };
      }
      return e;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Basic validation
      if (events.some(ev => !ev.sportName || !ev.teamName || !ev.captainName || !ev.captainMobile)) {
        throw new Error("Please fill all required fields for each event.");
      }

      const idToken = user ? await user.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('/api/events/college-register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collegeName,
          coordinatorName,
          coordinatorMobile,
          coordinatorEmail,
          events: events.map(({ id, ...rest }) => rest) // strip local temp ids
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register');

      setRegistrationId(data.registrationId);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#080204] font-[family-name:var(--font-josefin)] text-white p-4 sm:p-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-gradient-to-br from-[#24050a] via-[#140205] to-[#20040a] border-2 border-yellow-400 p-8 sm:p-10 rounded-[40px] sm:rounded-[56px] shadow-[0_0_60px_rgba(220,38,38,0.5)] text-center relative overflow-hidden">
          {/* Authentic ticket stub cutout side notches (NOT a plain rectangle) */}
          <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-12 h-12 rounded-full bg-[#080204] border-2 border-yellow-400 z-20 shadow-inner" />
          <div className="absolute top-1/2 -right-6 -translate-y-1/2 w-12 h-12 rounded-full bg-[#080204] border-2 border-yellow-400 z-20 shadow-inner" />

          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-yellow-400 uppercase mb-3 relative z-10">
            <span>✦</span> FESTORA PASS CREDENTIAL <span>✦</span>
          </div>

          <div className="my-2 flex justify-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/15 border border-yellow-400 text-yellow-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              ● REGISTRATION CONFIRMED • ACTIVE
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-marcellus)] text-white mb-2 uppercase tracking-wide relative z-10 mt-2">
            Registration Successful
          </h2>
          <p className="text-red-200 text-sm mb-6 max-w-md mx-auto relative z-10">
            Official pass generated. A confirmation email with QR credential has been dispatched to {coordinatorEmail || 'your email'}.
          </p>

          {/* Perforated dashed divider */}
          <div className="w-full border-t-2 border-dashed border-yellow-400/40 my-6 relative z-10" />

          <div className="bg-[#120205]/90 border border-yellow-400/30 rounded-3xl p-6 mb-6 flex flex-col items-center relative z-10 shadow-lg">
            <p className="text-xs uppercase tracking-widest text-yellow-400 mb-2 font-bold">Your Registration / Ticket ID</p>
            <p className="font-mono text-2xl sm:text-3xl text-yellow-300 font-bold mb-6 tracking-wider">{registrationId}</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block border-2 border-yellow-400 shadow-md">
              <QRCode value={registrationId} size={160} />
            </div>
            <p className="text-[10px] text-yellow-400/80 mt-4 uppercase tracking-widest font-bold">Present this QR code for gate admission</p>
          </div>

          <Link
            href={`/events/${params?.id}`}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold uppercase tracking-widest text-xs border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:brightness-110 inline-block text-center transition-all relative z-10"
          >
            Back to Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)] text-[var(--fg)] pb-20">
      <header className="fixed top-0 w-full z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/events/${params?.id}`} className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--fg)] transition-colors hover:text-[var(--gold)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-marcellus)] text-xl sm:text-2xl uppercase tracking-wide leading-none">College Registration</h1>
            <p className="text-[10px] sm:text-xs text-[var(--gold)] uppercase tracking-widest mt-1">Inter-College Sports & Quiz</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* College Details */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-8">
            <h2 className="text-lg font-[family-name:var(--font-marcellus)] uppercase text-[var(--gold)] border-b border-[var(--border-subtle)] pb-3 mb-5">
              1. College Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">College Name *</label>
                <input required type="text" value={collegeName} onChange={e => setCollegeName(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="e.g. Example Engineering College" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Coordinator Name *</label>
                <input required type="text" value={coordinatorName} onChange={e => setCoordinatorName(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Coordinator Mobile *</label>
                <input required type="tel" value={coordinatorMobile} onChange={e => setCoordinatorMobile(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Mobile Number" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Coordinator Email *</label>
                <input required type="email" value={coordinatorEmail} onChange={e => setCoordinatorEmail(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Email Address" />
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="space-y-6">
            <h2 className="text-lg font-[family-name:var(--font-marcellus)] uppercase text-[var(--gold)] border-b border-[var(--border-subtle)] pb-3 px-2">
              2. Event Registrations
            </h2>
            
            {events.map((event, index) => (
              <div key={event.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-8 relative">
                
                {events.length > 1 && (
                  <button type="button" onClick={() => removeEvent(event.id)} className="absolute top-5 right-5 text-[var(--fg-muted)] hover:text-red-500 transition-colors p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--fg)] mb-6">Entry #{index + 1}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Category *</label>
                    <select required value={event.category} onChange={e => updateEvent(event.id, 'category', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors appearance-none cursor-pointer">
                      <option value="Sports">Sports</option>
                      <option value="Quiz">Quiz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Sport/Event *</label>
                    <select required value={event.sportName} onChange={e => updateEvent(event.id, 'sportName', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors appearance-none cursor-pointer">
                      <option value="">Select Event</option>
                      {SPORT_OPTIONS[event.category as keyof typeof SPORT_OPTIONS].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-6 mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--gold)] mb-4">Participant / Captain Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Team Name / Individual Name *</label>
                      <input required type="text" value={event.teamName} onChange={e => updateEvent(event.id, 'teamName', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Name" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Captain Name *</label>
                      <input required type="text" value={event.captainName} onChange={e => updateEvent(event.id, 'captainName', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Name" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Captain Mobile *</label>
                      <input required type="tel" value={event.captainMobile} onChange={e => updateEvent(event.id, 'captainMobile', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Mobile Number" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2 font-bold">Captain Email</label>
                      <input type="email" value={event.captainEmail} onChange={e => updateEvent(event.id, 'captainEmail', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" placeholder="Optional Email" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--gold)]">Team Members</h4>
                    <button type="button" onClick={() => addTeamMember(event.id)} className="text-[10px] uppercase tracking-widest font-bold text-[var(--primary)] border border-[var(--primary)] px-3 py-1.5 rounded flex items-center gap-1 hover:bg-[var(--primary)] hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> Add Member
                    </button>
                  </div>
                  
                  {event.teamMembers.length === 0 ? (
                    <p className="text-xs text-[var(--fg-muted)] italic">No additional team members.</p>
                  ) : (
                    <div className="space-y-3">
                      {event.teamMembers.map((member, mIndex) => (
                        <div key={member.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[var(--bg)] p-3 rounded-lg border border-[var(--border-subtle)]">
                          <span className="text-[10px] font-bold text-[var(--fg-muted)] w-6">{mIndex + 1}.</span>
                          <input type="text" placeholder="Member Name" required value={member.name} onChange={e => updateTeamMember(event.id, member.id, 'name', e.target.value)} className="flex-1 bg-transparent border-b border-[var(--border-subtle)] focus:border-[var(--primary)] px-2 py-1 text-sm outline-none w-full sm:w-auto" />
                          <input type="tel" placeholder="Mobile (Optional)" value={member.mobile} onChange={e => updateTeamMember(event.id, member.id, 'mobile', e.target.value)} className="flex-1 bg-transparent border-b border-[var(--border-subtle)] focus:border-[var(--primary)] px-2 py-1 text-sm outline-none w-full sm:w-auto" />
                          <button type="button" onClick={() => removeTeamMember(event.id, member.id)} className="text-[var(--fg-muted)] hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))}

            <button type="button" onClick={addEvent} className="w-full border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-6 text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-inherit flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Add Another Event</span>
            </button>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded bg-[var(--primary)] text-white text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_var(--primary-glow)] transition-transform ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}>
              {isSubmitting ? 'Submitting...' : 'Complete Registration'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
