'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Mail, Phone, User, Plus, Minus, GraduationCap, Building, AlertCircle, Tag, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  EventRegistrationFields,
  DynamicRegistrationField,
  DynamicFieldAnswer,
  getEffectiveRegistrationFields
} from '@/types/event';
import { calculatePlatformFee } from '@/lib/payment';

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  rollNumber?: string;
  year?: string;
  college?: string;
  department?: string;
  school?: string;
  gender?: string;
  tshirtSize?: string;
  customAnswers?: Record<string, string>;
  registrationAnswers?: DynamicFieldAnswer[];
  [key: string]: any;
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
  registrationFields?: EventRegistrationFields;
  ticketPrice?: number;
  price?: number;
  currency?: string;
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
  paymentError?: string | null;
  isProcessing?: boolean;
  onClearPaymentError?: () => void;
}

export function TeamRegistrationModal({
  isOpen,
  onClose,
  event,
  onProceed,
  paymentError,
  isProcessing,
  onClearPaymentError
}: TeamRegistrationModalProps) {
  const { user } = useAuth();
  const isTeamEvent = Boolean(event.isTeamEvent);
  const minSize = isTeamEvent ? (event.teamSettings?.minTeamSize || 2) : 1;
  const maxSize = isTeamEvent ? Math.max(minSize, event.teamSettings?.maxTeamSize || 10) : 1;
  const allowIndividual = event.teamSettings?.allowIndividual || false;

  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(isTeamEvent ? minSize : 1);
  const [members, setMembers] = useState<TeamMember[]>(() => {
    const initialSize = isTeamEvent ? minSize : 1;
    return Array.from({ length: initialSize }, (_, i) => ({
      name: i === 0 ? (user?.displayName || '') : '',
      email: i === 0 ? (user?.email || '') : '',
      phone: '',
      rollNumber: '',
      year: '',
      college: '',
      department: '',
      school: '',
      gender: '',
      tshirtSize: '',
      customAnswers: {}
    }));
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if this is AIGNITE event
  const isAigniteEvent = event.id === 'AIGNITE';

  // Check if this is World Population Day 2026 event
  const isWpdEvent =
    event.id === 'world-population-day-2026' ||
    event.slug === 'world-population-day-2026' ||
    (typeof event.id === 'string' && event.id.toLowerCase().includes('world-population-day')) ||
    (typeof event.slug === 'string' && event.slug.toLowerCase().includes('world-population-day')) ||
    (typeof event.title === 'string' && event.title.toLowerCase().includes('world population day'));

  // Effective dynamic registration fields configured by organizer
  const dynamicFields = useMemo(() => {
    return getEffectiveRegistrationFields(event.registrationFields);
  }, [event.registrationFields]);

  // Helper to extract a member's value for a dynamic field
  const getMemberFieldValue = (member: TeamMember, field: DynamicRegistrationField): string => {
    if (member.customAnswers && member.customAnswers[field.id] !== undefined) {
      return String(member.customAnswers[field.id] ?? '');
    }
    if (member.customAnswers && member.customAnswers[field.label] !== undefined) {
      return String(member.customAnswers[field.label] ?? '');
    }
    const lowerLabel = field.label.toLowerCase();
    if (field.id === 'field_name' || lowerLabel === 'full name' || lowerLabel === 'name') {
      return member.name || '';
    }
    if (field.id === 'field_email' || lowerLabel === 'email') {
      return member.email || '';
    }
    if (field.id === 'field_phone' || lowerLabel === 'phone' || lowerLabel === 'phone number') {
      return member.phone || '';
    }
    if (field.id === 'field_tshirtSize' || lowerLabel === 't-shirt size') {
      return member.tshirtSize || '';
    }
    if (field.id === 'field_gender' || lowerLabel === 'gender') {
      return member.gender || '';
    }
    if (field.id === 'field_college' || lowerLabel.includes('college')) {
      return member.college || '';
    }
    if (field.id === 'field_department' || lowerLabel.includes('department')) {
      return member.department || '';
    }
    if (field.id === 'field_rollNumber' || lowerLabel.includes('roll number')) {
      return member.rollNumber || '';
    }
    if (field.id === 'field_year' || lowerLabel.includes('year')) {
      return member.year || '';
    }
    return '';
  };

  const updateMemberDynamicField = (index: number, field: DynamicRegistrationField, value: string) => {
    const updatedMembers = [...members];
    const curCustom = { ...(updatedMembers[index].customAnswers || {}) };
    curCustom[field.id] = value;
    curCustom[field.label] = value;

    const lowerLabel = field.label.toLowerCase();
    const updates: Partial<TeamMember> = {
      customAnswers: curCustom
    };

    if (field.id === 'field_name' || lowerLabel === 'full name' || lowerLabel === 'name') {
      updates.name = value;
    } else if (field.id === 'field_email' || lowerLabel === 'email') {
      updates.email = value;
    } else if (field.id === 'field_phone' || lowerLabel === 'phone' || lowerLabel === 'phone number') {
      updates.phone = value;
    } else if (field.id === 'field_tshirtSize' || lowerLabel === 't-shirt size') {
      updates.tshirtSize = value;
    } else if (field.id === 'field_gender' || lowerLabel === 'gender') {
      updates.gender = value;
    } else if (field.id === 'field_college' || lowerLabel.includes('college')) {
      updates.college = value;
    } else if (field.id === 'field_department' || lowerLabel.includes('department')) {
      updates.department = value;
    } else if (field.id === 'field_rollNumber' || lowerLabel.includes('roll number')) {
      updates.rollNumber = value;
    } else if (field.id === 'field_year' || lowerLabel.includes('year')) {
      updates.year = value;
    }

    updatedMembers[index] = {
      ...updatedMembers[index],
      ...updates
    };
    setMembers(updatedMembers);

    const errorKey = `member_${index}_${field.id}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr[errorKey];
        return newErr;
      });
    }
  };

  // Preset field configuration resolver (legacy backward compatibility)
  const getPresetConfig = (key: 'rollNumber' | 'college' | 'department' | 'year' | 'gender' | 'tshirtSize') => {
    const presets = event.registrationFields?.presets;
    if (!presets || presets.length === 0) {
      if (key === 'rollNumber' || key === 'college' || key === 'department' || key === 'year') {
        return { enabled: true, required: true };
      }
      return { enabled: false, required: false };
    }
    const found = presets.find(p => p.key === key);
    return found || { enabled: false, required: false };
  };

  const customFields = event.registrationFields?.customFields || [];

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
          school: '',
          gender: '',
          tshirtSize: '',
          customAnswers: {}
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

  const updateMemberCustomAnswer = (index: number, fieldId: string, value: string) => {
    const updatedMembers = [...members];
    const curCustom = updatedMembers[index].customAnswers || {};
    updatedMembers[index] = {
      ...updatedMembers[index],
      customAnswers: {
        ...curCustom,
        [fieldId]: value
      }
    };
    setMembers(updatedMembers);

    const errorKey = `member_${index}_custom_${fieldId}`;
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

    // Dynamic field validation for all participant members
    members.forEach((member, index) => {
      dynamicFields.forEach((df) => {
        const val = getMemberFieldValue(member, df).trim();
        if (df.required && !val) {
          newErrors[`member_${index}_${df.id}`] = `${df.label} is required`;
        } else if (df.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          newErrors[`member_${index}_${df.id}`] = 'Invalid email address';
        } else if (df.type === 'phone' && val && !/^[+]?[\d\s\-()]{10,}$/.test(val)) {
          newErrors[`member_${index}_${df.id}`] = 'Invalid phone number';
        }
      });
    });

    // Check for duplicate emails
    const emails = members
      .map(m => (m.email || getMemberFieldValue(m, dynamicFields.find(f => f.type === 'email') || { id: '', label: '', type: 'email', required: false, displayOrder: 1, showOnTicket: true })).toLowerCase().trim())
      .filter(Boolean);
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      duplicateEmails.forEach(email => {
        members.forEach((member, index) => {
          const mEmail = (member.email || '').toLowerCase().trim();
          if (mEmail === email) {
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
      const ticketPrice = event.ticketPrice ?? event.price ?? 0;
      const baseAmount = isAigniteEvent ? ticketPrice : ticketPrice * teamSize;
      const platformFee = calculatePlatformFee(teamSize, ticketPrice);
      const totalAmountWithFee = baseAmount + platformFee;

      const formattedMembers = members.map((member, index) => {
        const emailField = dynamicFields.find(f => f.id === 'field_email' || f.type === 'email');
        const nameField = dynamicFields.find(f => f.id === 'field_name' || f.label.toLowerCase() === 'full name' || f.label.toLowerCase() === 'name');
        const phoneField = dynamicFields.find(f => f.id === 'field_phone' || f.type === 'phone');

        const resolvedName = member.name || (nameField ? getMemberFieldValue(member, nameField) : '') || `Participant ${index + 1}`;
        const resolvedEmail = (member.email || (emailField ? getMemberFieldValue(member, emailField) : '') || user?.email || '').trim();
        const resolvedPhone = member.phone || (phoneField ? getMemberFieldValue(member, phoneField) : '') || '';

        const registrationAnswers: DynamicFieldAnswer[] = dynamicFields.map((df) => {
          const ans = getMemberFieldValue(member, df);
          return {
            fieldId: df.id,
            field_id: df.id,
            label: df.label,
            answer: ans,
            showOnTicket: df.showOnTicket,
            show_on_ticket: df.showOnTicket,
            fieldType: df.type,
            field_type: df.type
          };
        });

        const customAnswersMap = {
          ...(member.customAnswers || {}),
          ...registrationAnswers.reduce((acc, curr) => {
            acc[curr.fieldId] = String(curr.answer ?? '');
            acc[curr.label] = String(curr.answer ?? '');
            return acc;
          }, {} as Record<string, string>)
        };

        return {
          ...member,
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          registrationAnswers,
          customAnswers: customAnswersMap,
          college: isWpdEvent ? member.school || member.college : member.college || customAnswersMap['College / University'] || customAnswersMap['College'] || customAnswersMap['College/Company'],
          department: member.department || customAnswersMap['Department / Branch'] || customAnswersMap['Department'],
          rollNumber: member.rollNumber || customAnswersMap['Roll Number / Student ID'] || customAnswersMap['Roll Number'],
          year: member.year || customAnswersMap['Year of Study'] || customAnswersMap['Year'],
          tshirtSize: member.tshirtSize || customAnswersMap['T-Shirt Size'],
          gender: member.gender || customAnswersMap['Gender']
        };
      });

      await onProceed({
        teamName: isTeamEvent ? teamName : '',
        teamSize,
        members: formattedMembers,
        totalAmount: totalAmountWithFee,
        college: isWpdEvent ? members[0].school : isAigniteEvent ? members[0].college : formattedMembers[0]?.college,
        department: (isWpdEvent || isAigniteEvent) ? members[0].department : formattedMembers[0]?.department
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveTicketPrice = event.ticketPrice ?? event.price ?? 0;
  const baseTicketAmount = isAigniteEvent ? effectiveTicketPrice : effectiveTicketPrice * teamSize;
  const platformFee = calculatePlatformFee(teamSize, effectiveTicketPrice);
  const totalAmountPayable = baseTicketAmount + platformFee;

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

              {/* Payment Error / Cancellation Banner */}
              {paymentError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold uppercase tracking-wider text-red-400">
                        Payment Failed or Cancelled
                      </p>
                      {onClearPaymentError && (
                        <button
                          type="button"
                          onClick={onClearPaymentError}
                          className="text-[10px] text-red-400/80 hover:text-red-300 underline uppercase tracking-wider cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                    <p className="text-red-300/90 mt-1">
                      {paymentError} You have not been charged. Please review your details and click &quot;Proceed to Payment&quot; to try again.
                    </p>
                  </div>
                </div>
              )}

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
                          Total: ₹{baseTicketAmount}
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
                          {dynamicFields.map((field) => {
                            const value = getMemberFieldValue(member, field);
                            const err = errors[`member_${index}_${field.id}`];
                            const isSpan2 = field.type === 'textarea';

                            return (
                              <div key={field.id} className={isSpan2 ? 'md:col-span-2' : ''}>
                                <label className={labelClass}>
                                  {field.type === 'email' && <Mail className="w-3 h-3 inline mr-1" />}
                                  {field.type === 'phone' && <Phone className="w-3 h-3 inline mr-1" />}
                                  {field.label} {field.required && '*'}
                                  {field.showOnTicket && (
                                    <span title="Appears on downloaded ticket">
                                      <Ticket className="w-2.5 h-2.5 text-[var(--gold)] ml-1.5 inline opacity-85" />
                                    </span>
                                  )}
                                </label>

                                {field.type === 'textarea' ? (
                                  <textarea
                                    rows={3}
                                    value={value}
                                    onChange={(e) => updateMemberDynamicField(index, field, e.target.value)}
                                    className={inputClass}
                                    placeholder={field.placeholder || `Enter ${field.label}`}
                                  />
                                ) : field.type === 'dropdown' ? (
                                  <select
                                    value={value}
                                    onChange={(e) => updateMemberDynamicField(index, field, e.target.value)}
                                    className={inputClass}
                                  >
                                    <option value="" style={{ backgroundColor: '#140206', color: '#ffffff' }}>Select {field.label}</option>
                                    {field.options?.map((opt) => (
                                      <option key={opt} value={opt} style={{ backgroundColor: '#140206', color: '#ffffff' }}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.type === 'radio' ? (
                                  <div className="flex flex-wrap gap-4 pt-1">
                                    {field.options?.map((opt) => (
                                      <label key={opt} className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`member_${index}_${field.id}`}
                                          value={opt}
                                          checked={value === opt}
                                          onChange={() => updateMemberDynamicField(index, field, opt)}
                                          className="accent-[var(--primary)]"
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                ) : field.type === 'checkbox' ? (
                                  field.options && field.options.length > 0 ? (
                                    <div className="flex flex-wrap gap-4 pt-1">
                                      {field.options.map((opt) => {
                                        const selectedOpts = value ? value.split(',').map((s: string) => s.trim()) : [];
                                        const checked = selectedOpts.includes(opt);
                                        return (
                                          <label key={opt} className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(e) => {
                                                const next = e.target.checked
                                                  ? [...selectedOpts, opt]
                                                  : selectedOpts.filter((s: string) => s !== opt);
                                                updateMemberDynamicField(index, field, next.join(', '));
                                              }}
                                              className="accent-[var(--primary)]"
                                            />
                                            <span>{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <label className="flex items-center gap-2 pt-1 text-xs text-[var(--fg)] cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={value === 'Yes' || value === 'true'}
                                        onChange={(e) => updateMemberDynamicField(index, field, e.target.checked ? 'Yes' : 'No')}
                                        className="accent-[var(--primary)]"
                                      />
                                      <span>I confirm / agree for {field.label}</span>
                                    </label>
                                  )
                                ) : (
                                  <input
                                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                    value={value}
                                    onChange={(e) => updateMemberDynamicField(index, field, e.target.value)}
                                    className={inputClass}
                                    placeholder={field.placeholder || `Enter ${field.label}`}
                                  />
                                )}

                                {err && (
                                  <p className="text-[var(--primary)] text-xs mt-1 font-bold">{err}</p>
                                )}
                              </div>
                            );
                          })}
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
                          ({formatCurrency(effectiveTicketPrice)} x {teamSize})
                        </span>
                      )}
                      {isAigniteEvent && (
                        <span className="text-[var(--fg-muted)] text-xs ml-2">(per team)</span>
                      )}
                    </div>
                    <span className="text-[var(--fg)] font-bold">₹{baseTicketAmount}</span>
                  </div>

                  {baseTicketAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[var(--fg-muted)] text-sm">Platform Fee</span>
                        <span className="text-[var(--fg-muted)] text-xs ml-2">
                          (₹5 + {teamSize} {teamSize === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                      <span className="text-[var(--fg)] font-bold">₹{platformFee}</span>
                    </div>
                  )}

                  <div className="border-t border-[var(--border-subtle)] pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--fg)] font-bold uppercase tracking-wider text-sm">Total Amount</span>
                      <span className="text-3xl font-bold text-[var(--primary)] font-[family-name:var(--font-marcellus)]">
                        ₹{totalAmountPayable}
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
                  disabled={isSubmitting || isProcessing}
                  className="btn-primary flex-1 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || isProcessing ? 'Processing...' : 'Proceed to Payment'}
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
