'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  GraduationCap,
  Heart,
  Settings,
  Save,
  X,
  Edit
} from 'lucide-react';
import {
  AcademicForm,
  LocationForm,
  InterestsForm,
  SocialMediaForm,
  PreferencesForm,
  ProfileFormData
} from '@/components/dashboard/ProfileForms';
import { Spinner } from '@/components/ui/spinner';

export default function ProfileSettingsPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        gender: userProfile.gender || 'prefer-not-to-say',
        bio: userProfile.bio || '',
        profilePicture: userProfile.profilePicture || '',
        currentStatus: userProfile.currentStatus || 'student',
        institution: userProfile.institution || '',
        course: userProfile.course || '',
        graduationYear: userProfile.graduationYear || '',
        company: userProfile.company || '',
        jobTitle: userProfile.jobTitle || '',
        workExperience: userProfile.workExperience || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        country: userProfile.country || '',
        interests: userProfile.interests || [],
        skills: userProfile.skills || [],
        categories: userProfile.categories || [],
        socialMedia: userProfile.socialMedia || {},
        preferences: userProfile.preferences || {
          emailNotifications: true,
          eventRecommendations: true,
          promotionalEmails: false,
          publicProfile: true,
        },
        isProfileComplete: userProfile.isProfileComplete || false,
      });
    }
  }, [user, userProfile, loading, router]);

  const handleSave = async () => {
    if (!formData || !user) return;

    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await refreshProfile();
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        gender: userProfile.gender || 'prefer-not-to-say',
        bio: userProfile.bio || '',
        profilePicture: userProfile.profilePicture || '',
        currentStatus: userProfile.currentStatus || 'student',
        institution: userProfile.institution || '',
        course: userProfile.course || '',
        graduationYear: userProfile.graduationYear || '',
        company: userProfile.company || '',
        jobTitle: userProfile.jobTitle || '',
        workExperience: userProfile.workExperience || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        country: userProfile.country || '',
        interests: userProfile.interests || [],
        skills: userProfile.skills || [],
        categories: userProfile.categories || [],
        socialMedia: userProfile.socialMedia || {},
        preferences: userProfile.preferences || {
          emailNotifications: true,
          eventRecommendations: true,
          promotionalEmails: false,
          publicProfile: true,
        },
        isProfileComplete: userProfile.isProfileComplete || false,
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-20">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-[var(--fg-muted)] font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm mt-4">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (loading || !formData) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--primary)] text-center">
           <Spinner />
           <p className="font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'academic', label: 'Academic/Work', icon: GraduationCap },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'interests', label: 'Interests', icon: Heart },
    { id: 'social', label: 'Social Media', icon: Settings },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      {/* Ornament Lines */}
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 border-b border-[var(--border-subtle)] pb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">
                  Profile <span className="text-[var(--primary)]">Settings</span>
                </h1>
                <p className="text-[var(--fg-muted)]">
                  Manage your personal information and preferences
                </p>
              </div>
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 border border-[var(--border-subtle)] text-[var(--fg)] hover:text-[var(--primary)] hover:border-[var(--primary)] uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-3 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] hover:shadow-[0_0_20px_var(--primary-glow)] disabled:opacity-50 uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Tabs */}
            <div className="lg:w-64 flex-shrink-0">
               <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                       <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                             activeTab === tab.id
                                ? 'bg-[var(--bg-card)] text-[var(--primary)] border-[var(--primary)]'
                                : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)] border-transparent'
                          }`}
                       >
                          <Icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--fg-muted)]'}`} />
                          <span className="uppercase tracking-wide text-xs font-bold">{tab.label}</span>
                       </button>
                    );
                  })}
               </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
               <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 relative overflow-hidden corner-bracket"
               >
                  {activeTab === 'basic' && (
                     <div className="space-y-6">
                        <div className="flex items-center gap-6 mb-8">
                           <div className="w-24 h-24 bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center relative overflow-hidden">
                              {formData.profilePicture ? (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img
                                    src={formData.profilePicture}
                                    alt="Profile"
                                    className="mx-auto w-full h-full object-cover"
                                 />
                              ) : (
                                 <User className="w-10 h-10 text-[var(--fg-muted)]" />
                              )
                              }
                              {isEditing && (
                                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                                    <span className="text-white text-xs uppercase font-bold tracking-widest">Change</span>
                                 </div>
                              )}
                           </div>
                           <div>
                              <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
                                 {formData.firstName} {formData.lastName}
                              </h3>
                              <p className="text-[var(--fg-muted)] text-sm">{formData.currentStatus || 'Member'}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="deco-label">First Name</label>
                              <input
                                 type="text"
                                 value={formData.firstName}
                                 onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                 disabled={!isEditing}
                                 className="deco-input"
                              />
                           </div>
                           <div>
                              <label className="deco-label">Last Name</label>
                               <input
                                   type="text"
                                   value={formData.lastName}
                                   onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                   disabled={!isEditing}
                                   className="deco-input"
                               />
                           </div>
                           <div>
                              <label className="deco-label">Email</label>
                               <input
                                   type="email"
                                   value={formData.email}
                                   disabled={true}
                                   className="deco-input opacity-70 cursor-not-allowed"
                               />
                           </div>
                           <div>
                              <label className="deco-label">Phone</label>
                               <input
                                   type="tel"
                                   value={formData.phone}
                                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                   disabled={!isEditing}
                                   className="deco-input"
                               />
                           </div>
                           <div className="md:col-span-2">
                              <label className="deco-label">Bio</label>
                              <textarea
                                 value={formData.bio}
                                 onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                 disabled={!isEditing}
                                 className="deco-input min-h-[100px] py-3"
                                 placeholder="Tell us about yourself..."
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'academic' && (
                     <AcademicForm formData={formData} setFormData={setFormData} isEditing={isEditing} />
                  )}

                  {activeTab === 'location' && (
                     <LocationForm formData={formData} setFormData={setFormData} isEditing={isEditing} />
                  )}

                  {activeTab === 'interests' && (
                     <InterestsForm formData={formData} setFormData={setFormData} isEditing={isEditing} />
                  )}

                  {activeTab === 'social' && (
                     <SocialMediaForm formData={formData} setFormData={setFormData} isEditing={isEditing} />
                  )}

                  {activeTab === 'preferences' && (
                     <PreferencesForm formData={formData} setFormData={setFormData} isEditing={isEditing} />
                  )}
               </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// NOTE: Deprecated/Unused component removed to avoid confusion.
