'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Mail, Phone, User, Plus, Minus, GraduationCap, Building } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  rollNumber?: string;
  year?: string;
  college?: string;
  department?: string;
  school?: string;
}

interface Event {
  id: string;
  slug?: string;
  title: string;
  isTeamEvent?: boolean;
  teamSettings?: {
    minTeamSize?: number;
    maxTeamSize?: number;
    allowIndividual?: boolean;
  };
  ticketPrice?: number;
  totalTickets?: number;
  ticketsSold?: number;
}

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onProceed: (registrationData: {
    teamName: string;
    teamSize: number;
    members: TeamMember[];
    totalAmount: number;
    college?: string;
    department?: string;
  }) => void;
}

export function TeamRegistrationModal({
  isOpen,
  onClose,
  event,
  onProceed
}: TeamRegistrationModalProps) {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(event.teamSettings?.minTeamSize || 2);
  const [members, setMembers] = useState<TeamMember[]>(() => {
    const initialSize = event.teamSettings?.minTeamSize || 2;
    return Array.from({ length: initialSize }, () => ({
      name: '',
      email: '',
      phone: '',
      rollNumber: '',
      year: '',
      college: '',
      department: '',
      school: ''
    }));
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTeamEvent = event.isTeamEvent;
  const minSize = event.teamSettings?.minTeamSize || 2;
  const maxSize = event.teamSettings?.maxTeamSize || 1;
  const allowIndividual = event.teamSettings?.allowIndividual || false;

  // Check if this is AIGNITE event
  const isAigniteEvent = event.id === 'AIGNITE';

  // Check if this is World Population Day 2026 event
  const isWpdEvent =
    event.id === 'world-population-day-2026' ||
    event.slug === 'world-population-day-2026' ||
    (typeof event.id === 'string' && event.id.toLowerCase().includes('world-population-day')) ||
    (typeof event.slug === 'string' && event.slug.toLowerCase().includes('world-population-day')) ||
    (typeof event.title === 'string' && event.title.toLowerCase().includes('world population day'));

  const updateTeamSize = (newSize: number) => {
    if (newSize < minSize || newSize > maxSize) return;

    setTeamSize(newSize);

    // Adjust members array
    if (newSize > members.length) {
      const newMembers = [...members];
      for (let i = members.length; i < newSize; i++) {
        newMembers.push({
          name: '',
          email: '',
          phone: '',
          rollNumber: '',
          year: '',
          college: '',
          department: '',
          school: ''
        });
      }
      setMembers(newMembers);
    } else if (newSize < members.length) {
      setMembers(members.slice(0, newSize));
    }
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setMembers(updatedMembers);

    // Clear error for this field
    const errorKey = `member_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (isTeamEvent && !teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    }

    if (isWpdEvent) {
      members.forEach((member, index) => {
        if (!member.name.trim()) {
          newErrors[`member_${index}_name`] = 'Full Name is required';
        }
        if (!member.email.trim()) {
          newErrors[`member_${index}_email`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
          newErrors[`member_${index}_email`] = 'Invalid email format';
        }
        if (!member.phone.trim()) {
          newErrors[`member_${index}_phone`] = 'Phone number is required';
        } else if (!/^[+]?[\d\s\-()]{10,}$/.test(member.phone)) {
          newErrors[`member_${index}_phone`] = 'Invalid phone number';
        }
        if (!member.school?.trim()) {
          newErrors[`member_${index}_school`] = 'School is required';
        }
        if (!member.department?.trim()) {
          newErrors[`member_${index}_department`] = 'Department is required';
        }
        if (!member.year?.trim()) {
          newErrors[`member_${index}_year`] = 'Year is required';
        }
        if (!member.rollNumber?.trim()) {
          newErrors[`member_${index}_rollNumber`] = 'Roll Number is required';
        }
      });
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    members.forEach((member, index) => {
      if (!member.name.trim()) {
        newErrors[`member_${index}_name`] = 'Name is required';
      }
      if (!member.email.trim()) {
        newErrors[`member_${index}_email`] = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        newErrors[`member_${index}_email`] = 'Invalid email format';
      }
      if (!member.phone.trim()) {
        newErrors[`member_${index}_phone`] = 'Phone number is required';
      } else if (!/^[+]?[\d\s\-()]{10,}$/.test(member.phone)) {
        newErrors[`member_${index}_phone`] = 'Invalid phone number';
      }

      if (!member.rollNumber?.trim()) {
        newErrors[`member_${index}_rollNumber`] = 'Roll number is required';
      }
      if (!member.year?.trim()) {
        newErrors[`member_${index}_year`] = 'Year is required';
      }
      if (!member.college?.trim()) {
        newErrors[`member_${index}_college`] = 'College is required';
      }
      if (!member.department?.trim()) {
        newErrors[`member_${index}_department`] = 'Department is required';
      }
    });

    // Check for duplicate emails
    const emails = members.map(m => m.email.toLowerCase().trim()).filter(e => e);
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      duplicateEmails.forEach(email => {
        members.forEach((member, index) => {
          if (member.email.toLowerCase().trim() === email) {
            newErrors[`member_${index}_email`] = 'Duplicate email address';
          }
        });
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const baseAmount = isAigniteEvent ? (event.ticketPrice || 0) : (event.ticketPrice || 0) * teamSize;
      const gatewayFee = baseAmount > 0 ? baseAmount * 0.035 : 0;
      const totalAmountWithFee = baseAmount + gatewayFee;

      const formattedMembers = isWpdEvent
        ? members.map(member => ({
            ...member,
            email: member.email || user?.email || `${member.rollNumber || 'participant'}@mru.edu.in`,
            phone: member.phone || '',
            college: member.school || member.college || ''
          }))
        : members;

      await onProceed({
        teamName: isTeamEvent ? teamName : '',
        teamSize,
        members: formattedMembers,
        totalAmount: totalAmountWithFee,
        college: isWpdEvent ? members[0].school : isAigniteEvent ? members[0].college : undefined,
        department: (isWpdEvent || isAigniteEvent) ? members[0].department : undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = isAigniteEvent ? (event.ticketPrice || 0) : (event.ticketPrice || 0) * teamSize;

  if (!isOpen) return null;

  // Shared input class
  const inputClass = "w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors font-[family-name:var(--font-josefin)]";
  const labelClass = "block text-xs font-bold text-[var(--fg-muted)] mb-2 uppercase tracking-wider";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-lenis-prevent
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative" style={{ overscrollBehavior: 'contain' }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)] z-10" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                {isAigniteEvent ? 'Team Registration' : isTeamEvent ? 'Team Registration' : 'Registration Details'}
              </h2>
              <p className="text-[var(--fg-muted)] mt-1 text-sm">
                {event.title}
              </p>
              {isAigniteEvent && (
                <p className="text-[var(--primary)] text-xs mt-2 uppercase tracking-wider font-bold">
                  Team size: 2-4 members | Per team pricing
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }} data-lenis-prevent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Team Name */}
              {isTeamEvent && (
                <div>
                  <label className={labelClass}>
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className={inputClass}
                    placeholder="Enter your team name"
                  />
                  {errors.teamName && (
                    <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors.teamName}</p>
                  )}
                </div>
              )}

              {/* Team Size Selector */}
              {isTeamEvent && (
                <div>
                  <label className={labelClass}>
                    Team Size ({minSize}-{maxSize} members) *
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => updateTeamSize(teamSize - 1)}
                      disabled={teamSize <= minSize}
                      className="w-10 h-10 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-2xl font-bold text-[var(--fg)] min-w-[3rem] text-center font-[family-name:var(--font-marcellus)]">
                      {teamSize}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateTeamSize(teamSize + 1)}
                      disabled={teamSize >= maxSize}
                      className="w-10 h-10 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <div className="ml-4 text-sm text-[var(--fg-muted)]">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--gold)]" />
                        {teamSize === 1 ? '1 member' : `${teamSize} members`}
                      </div>
                      {isAigniteEvent && (
                        <div className="text-[var(--primary)] mt-1 font-bold">
                          Total: ₹{totalAmount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div className="space-y-6">
                {members.map((member, index) => (
                  <div key={index} className="p-6 bg-[var(--bg)] border border-[var(--border-subtle)] relative">
                    {/* Member card corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--gold)] opacity-50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--gold)] opacity-50" />

                    <h4 className="text-base font-bold text-[var(--fg)] mb-4 flex items-center gap-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                      <User className="w-5 h-5 text-[var(--gold)]" />
                      {isTeamEvent
                        ? (index === 0 ? 'Team Leader' : `Team Member ${index}`)
                        : 'Your Details'
                      }
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isWpdEvent ? (
                        <>
                          {/* Full Name */}
                          <div>
                            <label className={labelClass}>
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateMember(index, 'name', e.target.value)}
                              className={inputClass}
                              placeholder="Enter full name"
                            />
                            {errors[`member_${index}_name`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_name`]}</p>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <label className={labelClass}>
                              <Mail className="w-3 h-3 inline mr-1" />
                              Email *
                            </label>
                            <input
                              type="email"
                              value={member.email}
                              onChange={(e) => updateMember(index, 'email', e.target.value)}
                              className={inputClass}
                              placeholder="Enter email address"
                            />
                            {errors[`member_${index}_email`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_email`]}</p>
                            )}
                          </div>

                          {/* Phone */}
                          <div>
                            <label className={labelClass}>
                              <Phone className="w-3 h-3 inline mr-1" />
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              value={member.phone}
                              onChange={(e) => updateMember(index, 'phone', e.target.value)}
                              className={inputClass}
                              placeholder="Enter phone number"
                            />
                            {errors[`member_${index}_phone`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_phone`]}</p>
                            )}
                          </div>

                          {/* School Dropdown */}
                          <div>
                            <label className={labelClass}>
                              School *
                            </label>
                            <select
                              value={member.school || ''}
                              onChange={(e) => updateMember(index, 'school', e.target.value)}
                              className={inputClass}
                            >
                              <option value="">Select School</option>
                              <option value="School of Engineering">School of Engineering</option>
                              <option value="School of Agriculture Sciences">School of Agriculture Sciences</option>
                              <option value="School of Allied Healthcare Sciences">School of Allied Healthcare Sciences</option>
                              <option value="School of Management">School of Management</option>
                              <option value="School of Sciences">School of Sciences</option>
                            </select>
                            {errors[`member_${index}_school`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_school`]}</p>
                            )}
                          </div>

                          {/* Department */}
                          <div>
                            <label className={labelClass}>
                              Department *
                            </label>
                            <input
                              type="text"
                              value={member.department || ''}
                              onChange={(e) => updateMember(index, 'department', e.target.value)}
                              className={inputClass}
                              placeholder="Enter your department"
                            />
                            {errors[`member_${index}_department`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_department`]}</p>
                            )}
                          </div>

                          {/* Year */}
                          <div>
                            <label className={labelClass}>
                              Year *
                            </label>
                            <select
                              value={member.year || ''}
                              onChange={(e) => updateMember(index, 'year', e.target.value)}
                              className={inputClass}
                            >
                              <option value="">Select Year</option>
                              <option value="1st">1st Year</option>
                              <option value="2nd">2nd Year</option>
                              <option value="3rd">3rd Year</option>
                              <option value="4th">4th Year</option>
                            </select>
                            {errors[`member_${index}_year`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_year`]}</p>
                            )}
                          </div>

                          {/* Roll Number */}
                          <div>
                            <label className={labelClass}>
                              Roll Number *
                            </label>
                            <input
                              type="text"
                              value={member.rollNumber || ''}
                              onChange={(e) => updateMember(index, 'rollNumber', e.target.value)}
                              className={inputClass}
                              placeholder="Enter roll number"
                            />
                            {errors[`member_${index}_rollNumber`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_rollNumber`]}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Full Name */}
                          <div>
                            <label className={labelClass}>
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateMember(index, 'name', e.target.value)}
                              className={inputClass}
                              placeholder="Enter full name"
                            />
                            {errors[`member_${index}_name`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_name`]}</p>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <label className={labelClass}>
                              <Mail className="w-3 h-3 inline mr-1" />
                              Email *
                            </label>
                            <input
                              type="email"
                              value={member.email}
                              onChange={(e) => updateMember(index, 'email', e.target.value)}
                              className={inputClass}
                              placeholder="Enter email address"
                            />
                            {errors[`member_${index}_email`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_email`]}</p>
                            )}
                          </div>

                          {/* Phone */}
                          <div>
                            <label className={labelClass}>
                              <Phone className="w-3 h-3 inline mr-1" />
                              Phone *
                            </label>
                            <input
                              type="tel"
                              value={member.phone}
                              onChange={(e) => updateMember(index, 'phone', e.target.value)}
                              className={inputClass}
                              placeholder="Enter phone number"
                            />
                            {errors[`member_${index}_phone`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_phone`]}</p>
                            )}
                          </div>

                          {/* Roll Number */}
                          <div>
                            <label className={labelClass}>
                              Roll Number *
                            </label>
                            <input
                              type="text"
                              value={member.rollNumber || ''}
                              onChange={(e) => updateMember(index, 'rollNumber', e.target.value)}
                              className={inputClass}
                              placeholder="Enter roll number"
                            />
                            {errors[`member_${index}_rollNumber`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_rollNumber`]}</p>
                            )}
                          </div>

                          {/* Year */}
                          <div>
                            <label className={labelClass}>
                              Year *
                            </label>
                            <select
                              value={member.year || ''}
                              onChange={(e) => updateMember(index, 'year', e.target.value)}
                              className={inputClass}
                            >
                              <option value="">Select Year</option>
                              <option value="1st">1st Year</option>
                              <option value="2nd">2nd Year</option>
                              <option value="3rd">3rd Year</option>
                              <option value="4th">4th Year</option>
                            </select>
                            {errors[`member_${index}_year`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_year`]}</p>
                            )}
                          </div>

                          {/* College/University */}
                          <div>
                            <label className={labelClass}>
                              <Building className="w-3 h-3 inline mr-1" />
                              College/University *
                            </label>
                            <input
                              type="text"
                              value={member.college || ''}
                              onChange={(e) => updateMember(index, 'college', e.target.value)}
                              className={inputClass}
                              placeholder="Enter college/university name"
                            />
                            {errors[`member_${index}_college`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_college`]}</p>
                            )}
                          </div>

                          {/* Department */}
                          <div>
                            <label className={labelClass}>
                              <GraduationCap className="w-3 h-3 inline mr-1" />
                              Department *
                            </label>
                            <input
                              type="text"
                              value={member.department || ''}
                              onChange={(e) => updateMember(index, 'department', e.target.value)}
                              className={inputClass}
                              placeholder="Enter your department"
                            />
                            {errors[`member_${index}_department`] && (
                              <p className="text-[var(--primary)] text-xs mt-1 font-bold">{errors[`member_${index}_department`]}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Summary */}
              <div className="p-6 bg-[var(--primary)]/5 border border-[var(--primary)]/20 relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[var(--gold)] opacity-50" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[var(--gold)] opacity-50" />

                <h4 className="text-base font-bold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-wider">Payment Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[var(--fg-muted)] text-sm">Ticket Price</span>
                      {!isAigniteEvent && (
                        <span className="text-[var(--fg-muted)] text-xs ml-2">
                          ({formatCurrency(event.ticketPrice || 0)} x {teamSize})
                        </span>
                      )}
                      {isAigniteEvent && (
                        <span className="text-[var(--fg-muted)] text-xs ml-2">(per team)</span>
                      )}
                    </div>
                    <span className="text-[var(--fg)] font-bold">₹{totalAmount}</span>
                  </div>

                  {totalAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--fg-muted)] text-sm">Gateway Fee <span className="text-xs">(3.5%)</span></span>
                      <span className="text-[var(--fg)] font-bold">₹{(totalAmount * 0.035).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-[var(--border-subtle)] pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--fg)] font-bold uppercase tracking-wider text-sm">Total Amount</span>
                      <span className="text-3xl font-bold text-[var(--primary)] font-[family-name:var(--font-marcellus)]">
                        ₹{totalAmount > 0 ? (totalAmount + totalAmount * 0.035).toFixed(2) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost flex-1 h-12"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
