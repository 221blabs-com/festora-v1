'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { UserProfile } from '@/types/user';
import {
  User,
  GraduationCap,
  MapPin,
  Heart,
  Link as LinkIcon,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Briefcase,
  Star,
  Globe,
  Mail,
  Phone,
  Building2,
  Award,
} from 'lucide-react';

const onboardingSteps = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Tell us about yourself',
    icon: User,
  },
  {
    id: 2,
    title: 'Academic & Professional',
    description: 'Your education and career details',
    icon: GraduationCap,
  },
  {
    id: 3,
    title: 'Location & Contact',
    description: 'Where are you based?',
    icon: MapPin,
  },
  {
    id: 4,
    title: 'Interests & Skills',
    description: 'What interests you?',
    icon: Heart,
  },
  {
    id: 5,
    title: 'Social Media',
    description: 'Connect your profiles',
    icon: LinkIcon,
  },
  {
    id: 6,
    title: 'Preferences',
    description: 'Customize your experience',
    icon: Settings,
  },
];

const interests = [
  'Technology', 'Business', 'Arts & Culture', 'Education', 'Sports', 'Music',
  'Photography', 'Travel', 'Food', 'Fashion', 'Gaming', 'Health & Fitness',
  'Environment', 'Social Impact', 'Entrepreneurship', 'Design', 'Science',
  'Literature', 'Film & Media', 'Politics', 'Finance', 'Marketing'
];

const skills = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Design', 'Marketing',
  'Public Speaking', 'Project Management', 'Data Analysis', 'Writing',
  'Photography', 'Video Editing', 'Social Media', 'Leadership',
  'Communication', 'Problem Solving', 'Team Work', 'Creative Thinking',
  'Research', 'Sales', 'Customer Service', 'Teaching'
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer-not-to-say',
    bio: '',
    profilePicture: '',
    currentStatus: 'student',
    institution: '',
    course: '',
    graduationYear: '',
    company: '',
    jobTitle: '',
    workExperience: '',
    city: '',
    state: '',
    country: 'United States',
    interests: [],
    skills: [],
    categories: [],
    socialMedia: {
      linkedin: '',
      github: '',
      instagram: '',
      twitter: '',
      portfolio: '',
    },
    preferences: {
      emailNotifications: true,
      eventRecommendations: true,
      promotionalEmails: false,
      publicProfile: true,
    },
    onboardingStep: 1,
  });

  // const etherColors = useMemo(() => ['#1e40af', '#6366f1', '#8b5cf6'], []); // Removed

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [user, router]);

  const updateProfile = (field: keyof UserProfile, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const updateSocialMedia = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [platform]: value }
    }));
  };

  const updatePreferences = (pref: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        emailNotifications: prev.preferences?.emailNotifications ?? true,
        eventRecommendations: prev.preferences?.eventRecommendations ?? true,
        promotionalEmails: prev.preferences?.promotionalEmails ?? false,
        publicProfile: prev.preferences?.publicProfile ?? true,
        [pref]: value
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    let isValid = true;
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName) {
          isValid = false;
          errors.firstName = 'First name is required';
        }
        if (!formData.lastName) {
          isValid = false;
          errors.lastName = 'Last name is required';
        }
        if (!formData.phone) {
          isValid = false;
          errors.phone = 'Phone number is required';
        } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone)) {
          isValid = false;
          errors.phone = 'Invalid phone number';
        }
        if (!formData.dateOfBirth) {
          isValid = false;
          errors.dateOfBirth = 'Date of birth is required';
        }
        break;
      case 2:
        if (formData.currentStatus === 'student') {
          if (!formData.institution) {
            isValid = false;
            errors.institution = 'Institution is required';
          }
          if (!formData.course) {
            isValid = false;
            errors.course = 'Course/Major is required';
          }
        } else if (formData.currentStatus === 'working-professional') {
          if (!formData.company) {
            isValid = false;
            errors.company = 'Company is required';
          }
          if (!formData.jobTitle) {
            isValid = false;
            errors.jobTitle = 'Job title is required';
          }
        }
        break;
      case 3:
        if (!formData.city) {
          isValid = false;
          errors.city = 'City is required';
        }
        if (!formData.state) {
          isValid = false;
          errors.state = 'State is required';
        }
        if (!formData.country) {
          isValid = false;
          errors.country = 'Country is required';
        }
        break;
      case 4:
        if ((formData.interests?.length || 0) === 0) {
          isValid = false;
          errors.interests = 'At least one interest is required';
        }
        if ((formData.skills?.length || 0) === 0) {
          isValid = false;
          errors.skills = 'At least one skill is required';
        }
        break;
      case 5:
        // Social media is optional, no validation needed
        break;
      case 6:
        // Preferences have defaults, no validation needed
        break;
      default:
        break;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(6, prev + 1));
    } else {
      setError('Please fill in all required fields before continuing.');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const completeProfile: UserProfile = {
        ...formData,
        isProfileComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingStep: 6,
      } as UserProfile;

      // Save to Firebase/API
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify(completeProfile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Profile setup error:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, field: keyof UserProfile) => {
    const currentArray = array || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateProfile(field, newArray);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-[family-name:var(--font-josefin)]">
        <div className="text-[var(--primary)] text-center">
          <Spinner />
          <p className="uppercase tracking-widest text-sm font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed"></div>
      
      {/* Ornament Lines */}
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl w-full">
          {/* Progress Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl font-bold mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
              Complete Your{' '}
              <span className="text-[var(--primary)]">
                Profile
              </span>
            </h1>
            <p className="text-[var(--fg-muted)] mb-8 max-w-lg mx-auto">
              Tell us about yourself to get personalized event recommendations
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] h-3 mb-4 relative">
              <div
                className="bg-[var(--primary)] h-full transition-all duration-300"
                style={{ width: `${(currentStep / onboardingSteps.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[var(--fg-muted)]">
               <span>Start</span>
               <span>Step {currentStep} of {onboardingSteps.length}</span>
               <span>Finish</span>
            </div>
          </motion.div>

          {/* Main Form Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 md:p-12 relative shadow-2xl"
          >



            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                      <div className="w-16 h-16 rounded-full border border-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)] flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <User className="w-8 h-8 text-[var(--primary)]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Basic Information
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Let&apos;s start with the basics about you
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          First Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => updateProfile('firstName', e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="Enter your first name"
                          />
                          {validationErrors.firstName && (
                            <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                              {validationErrors.firstName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => updateProfile('lastName', e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                          placeholder="Enter your last name"
                        />
                        {validationErrors.lastName && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.lastName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Phone Number *
                        </label>
                        <div className="relative group">
                           <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                              <Phone className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                           </div>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => updateProfile('phone', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        {validationErrors.phone && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.phone}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => updateProfile('dateOfBirth', e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                        />
                        {validationErrors.dateOfBirth && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.dateOfBirth}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => updateProfile('gender', e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Bio (Optional)
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => updateProfile('bio', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors resize-none"
                          placeholder="Tell us a bit about yourself..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-8">
                     <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                      <div className="w-16 h-16 rounded-full border border-[var(--gold)] shadow-[0_0_15px_var(--gold-glow)] flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <GraduationCap className="w-8 h-8 text-[var(--gold)]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Academic & Professional
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Tell us about your education and career
                      </p>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-4">
                          Current Status *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { value: 'student', label: 'Student', icon: GraduationCap },
                            { value: 'working-professional', label: 'Working Professional', icon: Briefcase },
                            { value: 'entrepreneur', label: 'Entrepreneur', icon: Star },
                            { value: 'other', label: 'Other', icon: User },
                          ].map(({ value, label, icon: Icon }) => (
                            <label
                              key={value}
                              className={`flex flex-col items-center p-4 border cursor-pointer transition-all duration-200 relative group ${
                                formData.currentStatus === value
                                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                  : 'border-[var(--border-subtle)] hover:border-[var(--gold)]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="currentStatus"
                                value={value}
                                checked={formData.currentStatus === value}
                                onChange={(e) => updateProfile('currentStatus', e.target.value)}
                                className="sr-only"
                              />
                               <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--fg)] opacity-0 group-hover:opacity-50 transition-opacity"></div>
                               <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--fg)] opacity-0 group-hover:opacity-50 transition-opacity"></div>
                               
                              <Icon className={`w-8 h-8 mb-2 ${
                                formData.currentStatus === value ? 'text-[var(--primary)]' : 'text-[var(--fg-muted)]'
                              }`} />
                              <span className={`text-xs font-bold uppercase tracking-wide text-center ${
                                formData.currentStatus === value ? 'text-[var(--primary)]' : 'text-[var(--fg)]'
                              }`}>
                                {label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {formData.currentStatus === 'student' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Institution *
                            </label>
                            <div className="relative group">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                 <Building2 className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                              </div>
                              <input
                                type="text"
                                value={formData.institution}
                                onChange={(e) => updateProfile('institution', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                placeholder="e.g., Stanford University"
                              />
                            </div>
                            {validationErrors.institution && (
                              <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                                {validationErrors.institution}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                             <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Course/Major *
                            </label>
                            <div className="relative group">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Award className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                              </div>
                              <input
                                type="text"
                                value={formData.course}
                                onChange={(e) => updateProfile('course', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                placeholder="e.g., Computer Science"
                              />
                            </div>
                            {validationErrors.course && (
                              <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                                {validationErrors.course}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Graduation Year
                            </label>
                            <input
                              type="number"
                              value={formData.graduationYear}
                              onChange={(e) => updateProfile('graduationYear', e.target.value)}
                              className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                              placeholder="2025"
                              min="2020"
                              max="2030"
                            />
                          </div>
                        </div>
                      )}

                      {formData.currentStatus === 'working-professional' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Company *
                            </label>
                            <div className="relative group">
                               <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Building2 className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                               </div>
                              <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => updateProfile('company', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                placeholder="e.g., Google"
                              />
                            </div>
                            {validationErrors.company && (
                              <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                                {validationErrors.company}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                             <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Job Title *
                            </label>
                            <div className="relative group">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Briefcase className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                              </div>
                              <input
                                type="text"
                                value={formData.jobTitle}
                                onChange={(e) => updateProfile('jobTitle', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                                placeholder="e.g., Software Engineer"
                              />
                            </div>
                            {validationErrors.jobTitle && (
                              <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                                {validationErrors.jobTitle}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                             <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                              Years of Experience
                            </label>
                            <select
                              value={formData.workExperience}
                              onChange={(e) => updateProfile('workExperience', e.target.value)}
                              className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none"
                            >
                              <option value="">Select experience</option>
                              <option value="0-1">0-1 years</option>
                              <option value="2-5">2-5 years</option>
                              <option value="6-10">6-10 years</option>
                              <option value="11+">11+ years</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                       <div className="w-16 h-16 border border-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <MapPin className="w-8 h-8 text-[var(--primary)] " />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Location & Contact
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Where are you based?
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => updateProfile('city', e.target.value)}
                           className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                          placeholder="e.g., San Francisco"
                        />
                        {validationErrors.city && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.city}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => updateProfile('state', e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                          placeholder="e.g., California"
                        />
                        {validationErrors.state && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.state}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                         <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Country *
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                            <Globe className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                          </div>
                          <select
                            value={formData.country}
                            onChange={(e) => updateProfile('country', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="India">India</option>
                            <option value="Australia">Australia</option>
                            <option value="Germany">Germany</option>
                            <option value="France">France</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {validationErrors.country && (
                          <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wide">
                            {validationErrors.country}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-8">
                     <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                       <div className="w-16 h-16 border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <Heart className="w-8 h-8 text-[var(--gold)] " />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Interests & Skills
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Help us recommend relevant events and opportunities
                      </p>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-4">
                          Interests * (Select at least 1)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {interests.map((interest) => (
                            <label
                              key={interest}
                              className={`flex items-center justify-center p-3 border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                                formData.interests?.includes(interest)
                                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                  : 'border-[var(--border-subtle)] hover:border-[var(--gold)] text-[var(--fg-muted)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.interests?.includes(interest) || false}
                                onChange={() => toggleArrayItem(formData.interests || [], interest, 'interests')}
                                className="sr-only"
                              />
                               {formData.interests?.includes(interest) && (
                                  <>
                                     <div className="absolute top-0 right-0 w-2 h-2 bg-[var(--primary)]"></div>
                                     <div className="absolute bottom-0 left-0 w-2 h-2 bg-[var(--primary)]"></div>
                                  </>
                               )}
                              <span className="text-xs font-bold uppercase tracking-wide text-center">
                                {interest}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--fg-muted)] mt-3">
                          Selected: {formData.interests?.length || 0} interests
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-4">
                          Skills * (Select at least 1)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {skills.map((skill) => (
                            <label
                              key={skill}
                              className={`flex items-center justify-center p-3 border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                                formData.skills?.includes(skill)
                                  ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]'
                                  : 'border-[var(--border-subtle)] hover:border-[var(--gold)] text-[var(--fg-muted)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.skills?.includes(skill) || false}
                                onChange={() => toggleArrayItem(formData.skills || [], skill, 'skills')}
                                className="sr-only"
                              />
                               {formData.skills?.includes(skill) && (
                                  <>
                                     <div className="absolute top-0 right-0 w-2 h-2 bg-[var(--gold)]"></div>
                                     <div className="absolute bottom-0 left-0 w-2 h-2 bg-[var(--gold)]"></div>
                                  </>
                               )}
                              <span className="text-xs font-bold uppercase tracking-wide text-center">
                                {skill}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--fg-muted)] mt-3">
                          Selected: {formData.skills?.length || 0} skills
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-8">
                     <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                       <div className="w-16 h-16 border border-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <LinkIcon className="w-8 h-8 text-[var(--primary)] " />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Social Media Links
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Connect your social profiles (optional)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          LinkedIn
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none opacity-50">
                             <span className="text-xs font-bold text-[var(--fg)]">In</span>
                          </div>
                          <input
                            type="url"
                            value={formData.socialMedia?.linkedin || ''}
                            onChange={(e) => updateSocialMedia('linkedin', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          GitHub
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none opacity-50">
                             <span className="text-xs font-bold text-[var(--fg)]">GH</span>
                          </div>
                          <input
                            type="url"
                            value={formData.socialMedia?.github || ''}
                            onChange={(e) => updateSocialMedia('github', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="https://github.com/username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Instagram
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none opacity-50">
                             <span className="text-xs font-bold text-[var(--fg)]">IG</span>
                          </div>
                          <input
                            type="url"
                            value={formData.socialMedia?.instagram || ''}
                            onChange={(e) => updateSocialMedia('instagram', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="https://instagram.com/username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Twitter
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none opacity-50">
                             <span className="text-xs font-bold text-[var(--fg)]">X</span>
                          </div>
                          <input
                            type="url"
                            value={formData.socialMedia?.twitter || ''}
                            onChange={(e) => updateSocialMedia('twitter', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="https://twitter.com/username"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                         <label className="block text-xs font-bold uppercase tracking-widest text-[var(--fg)] mb-2">
                          Portfolio/Website
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                            <Globe className="w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                          </div>
                          <input
                            type="url"
                            value={formData.socialMedia?.portfolio || ''}
                            onChange={(e) => updateSocialMedia('portfolio', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-8">
                    <div className="text-center mb-10 border-b border-[var(--border-subtle)] pb-8">
                       <div className="w-16 h-16 border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-8 bg-[var(--bg)]">
                        <Settings className="w-8 h-8 text-[var(--gold)] " />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-2">
                        Preferences
                      </h2>
                      <p className="text-[var(--fg-muted)]">
                        Customize your experience
                      </p>
                    </div>

                    <div className="space-y-6">
                      {[
                        {
                          key: 'emailNotifications',
                          title: 'Email Notifications',
                          description: 'Receive notifications about events and updates',
                          icon: Mail
                        },
                        {
                          key: 'eventRecommendations',
                          title: 'Event Recommendations',
                          description: 'Get personalized event suggestions based on your interests',
                          icon: Heart
                        },
                        {
                          key: 'promotionalEmails',
                          title: 'Promotional Emails',
                          description: 'Receive promotional content and special offers',
                          icon: Star
                        },
                        {
                          key: 'publicProfile',
                          title: 'Public Profile',
                          description: 'Make your profile visible to other users and event organizers',
                          icon: Globe
                        }
                      ].map(({ key, title, description, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between p-6 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors duration-200">
                          <div className="flex items-start space-x-6">
                            <div className="w-10 h-10 border border-[var(--gold)] rounded-full flex items-center justify-center mt-1 bg-[var(--bg)]">
                              <Icon className="w-5 h-5 text-[var(--gold)] " />
                            </div>
                            <div>
                               <h3 className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm">{title}</h3>
                              <p className="text-xs text-[var(--fg-muted)] mt-1">{description}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.preferences?.[key as keyof typeof formData.preferences] || false}
                              onChange={(e) => updatePreferences(key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[var(--bg)] border border-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--fg-muted)] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)] peer-checked:after:bg-white peer-checked:border-[var(--primary)]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-subtle)]">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-6 py-3 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-bold uppercase tracking-widest text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                      index + 1 === currentStep
                        ? 'bg-[var(--primary)] scale-150'
                        : index + 1 < currentStep
                        ? 'bg-[var(--gold)]'
                        : 'bg-[var(--border-subtle)]'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={currentStep === onboardingSteps.length ? handleSubmit : nextStep}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-8 py-3 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold uppercase tracking-widest text-xs shadow-[0_0_15px_var(--primary-glow)]"
              >
                {isSubmitting ? (
                  <Spinner inline />
                ) : (
                  <>
                    <span>{currentStep === onboardingSteps.length ? 'Complete' : 'Next'}</span>
                    {currentStep === onboardingSteps.length ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
