import React from 'react';
import {
  UserProfile,
} from '@/types/user';

// Define the ProfileFormData type locally since it's used across components
export type ProfileFormData = Omit<UserProfile, 'createdAt' | 'updatedAt' | 'onboardingStep'>;

// Academic/Work Form Component
export function AcademicForm({ formData, setFormData, isEditing }: {
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
        Academic & Professional Information
      </h3>

      <div>
        <label className="deco-label">
          Current Status
        </label>
        <select
          value={formData.currentStatus}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as any })}
          disabled={!isEditing}
          className="deco-input bg-[var(--bg-card)]"
        >
          <option value="student">Student</option>
          <option value="working-professional">Working Professional</option>
          <option value="entrepreneur">Entrepreneur</option>
          <option value="other">Other</option>
        </select>
      </div>

      {(formData.currentStatus === 'student' || formData.currentStatus === 'other') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="deco-label">
              Institution
            </label>
            <input
              type="text"
              value={formData.institution || ''}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              disabled={!isEditing}
              className="deco-input"
              placeholder="University/College name"
            />
          </div>

          <div>
            <label className="deco-label">
              Course
            </label>
            <input
              type="text"
              value={formData.course || ''}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              disabled={!isEditing}
              className="deco-input"
              placeholder="e.g., Computer Science"
            />
          </div>

          <div>
            <label className="deco-label">
              Graduation Year
            </label>
            <input
              type="text"
              value={formData.graduationYear || ''}
              onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
              disabled={!isEditing}
              className="deco-input"
              placeholder="e.g., 2025"
            />
          </div>
        </div>
      )}

      {(formData.currentStatus === 'working-professional' || formData.currentStatus === 'entrepreneur') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="deco-label">
              Company
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              disabled={!isEditing}
              className="deco-input"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="deco-label">
              Job Title
            </label>
            <input
              type="text"
              value={formData.jobTitle || ''}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              disabled={!isEditing}
              className="deco-input"
              placeholder="Your position"
            />
          </div>

          <div className="md:col-span-2">
            <label className="deco-label">
              Work Experience
            </label>
            <select
              value={formData.workExperience || ''}
              onChange={(e) => setFormData({ ...formData, workExperience: e.target.value })}
              disabled={!isEditing}
              className="deco-input bg-[var(--bg-card)]"
            >
              <option value="">Select experience</option>
              <option value="0-1">0-1 years</option>
              <option value="1-3">1-3 years</option>
              <option value="3-5">3-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// Location Form Component
export function LocationForm({ formData, setFormData, isEditing }: {
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
        Location Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="deco-label">
            City
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            disabled={!isEditing}
            className="deco-input"
            placeholder="Your city"
          />
        </div>

        <div>
          <label className="deco-label">
            State
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            disabled={!isEditing}
            className="deco-input"
            placeholder="Your state/province"
          />
        </div>

        <div>
          <label className="deco-label">
            Country
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            disabled={!isEditing}
            className="deco-input"
            placeholder="Your country"
          />
        </div>
      </div>
    </div>
  );
}

// Interests Form Component
export function InterestsForm({ formData, setFormData, isEditing }: {
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  isEditing: boolean;
}) {
  const availableInterests = [
    'Technology', 'Music', 'Sports', 'Art', 'Photography', 'Travel', 'Cooking',
    'Reading', 'Gaming', 'Fitness', 'Dancing', 'Writing', 'Movies', 'Fashion',
    'Entrepreneurship', 'Volunteering', 'Environment', 'Science', 'History'
  ];

  const availableSkills = [
    'Programming', 'Design', 'Marketing', 'Photography', 'Writing', 'Public Speaking',
    'Leadership', 'Project Management', 'Data Analysis', 'Social Media', 'Video Editing',
    'Music Production', 'Teaching', 'Research', 'Languages', 'Finance', 'Sales'
  ];

  const eventCategories = [
    'Technology', 'Business', 'Arts & Culture', 'Sports', 'Education', 'Health & Wellness',
    'Music', 'Food & Drink', 'Travel', 'Fashion', 'Gaming', 'Networking', 'Workshops'
  ];

  const toggleArrayItem = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
        Interests & Skills
      </h3>

      {/* Interests */}
      <div>
        <label className="deco-label mb-3">
          Interests
        </label>
        <div className="flex flex-wrap gap-2">
          {availableInterests.map((interest) => (
            <button
              key={interest}
              type="button"
              disabled={!isEditing}
              onClick={() => toggleArrayItem(
                formData.interests,
                interest,
                (newInterests) => setFormData({ ...formData, interests: newInterests })
              )}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border transition-all ${
                formData.interests.includes(interest)
                  ? 'bg-[var(--primary)] text-[var(--fg)] border-[var(--primary)]'
                  : 'bg-transparent text-[var(--fg-muted)] border-[var(--border-subtle)] hover:text-[var(--fg)] hover:border-[var(--primary)]'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="deco-label mb-3">
          Skills
        </label>
        <div className="flex flex-wrap gap-2">
          {availableSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              disabled={!isEditing}
              onClick={() => toggleArrayItem(
                formData.skills,
                skill,
                (newSkills) => setFormData({ ...formData, skills: newSkills })
              )}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border transition-all ${
                formData.skills.includes(skill)
                  ? 'bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]'
                  : 'bg-transparent text-[var(--fg-muted)] border-[var(--border-subtle)] hover:text-[var(--fg)] hover:border-[var(--gold)]'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Event Categories */}
      <div>
        <label className="deco-label mb-3">
          Event Categories of Interest
        </label>
        <div className="flex flex-wrap gap-2">
          {eventCategories.map((category) => (
            <button
              key={category}
              type="button"
              disabled={!isEditing}
              onClick={() => toggleArrayItem(
                formData.categories,
                category,
                (newCategories) => setFormData({ ...formData, categories: newCategories })
              )}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border transition-all ${
                formData.categories.includes(category)
                  ? 'bg-[var(--primary)] text-[var(--fg)] border-[var(--primary)]'
                  : 'bg-transparent text-[var(--fg-muted)] border-[var(--border-subtle)] hover:text-[var(--fg)] hover:border-[var(--primary)]'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Social Media Form Component
export function SocialMediaForm({ formData, setFormData, isEditing }: {
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  isEditing: boolean;
}) {
  const updateSocialMedia = (platform: string, value: string) => {
    setFormData({
      ...formData,
      socialMedia: {
        ...formData.socialMedia,
        [platform]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
        Social Media Links
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="deco-label">
            LinkedIn
          </label>
          <input
            type="url"
            value={formData.socialMedia.linkedin || ''}
            onChange={(e) => updateSocialMedia('linkedin', e.target.value)}
            disabled={!isEditing}
            className="deco-input"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        <div>
          <label className="deco-label">
            GitHub
          </label>
          <input
            type="url"
            value={formData.socialMedia.github || ''}
            onChange={(e) => updateSocialMedia('github', e.target.value)}
            disabled={!isEditing}
            className="deco-input"
            placeholder="https://github.com/yourusername"
          />
        </div>

        <div>
          <label className="deco-label">
            Instagram
          </label>
          <input
            type="url"
            value={formData.socialMedia.instagram || ''}
            onChange={(e) => updateSocialMedia('instagram', e.target.value)}
            disabled={!isEditing}
            className="deco-input"
            placeholder="https://instagram.com/yourusername"
          />
        </div>

        <div>
          <label className="deco-label">
            Twitter
          </label>
          <input
            type="url"
            value={formData.socialMedia.twitter || ''}
            onChange={(e) => updateSocialMedia('twitter', e.target.value)}
            disabled={!isEditing}
            className="deco-input"
            placeholder="https://twitter.com/yourusername"
          />
        </div>

        <div className="md:col-span-2">
          <label className="deco-label">
            Portfolio Website
          </label>
          <input
            type="url"
            value={formData.socialMedia.portfolio || ''}
            onChange={(e) => updateSocialMedia('portfolio', e.target.value)}
            disabled={!isEditing}
            className="deco-input"
            placeholder="https://yourportfolio.com"
          />
        </div>
      </div>
    </div>
  );
}

// Preferences Form Component
export function PreferencesForm({ formData, setFormData, isEditing }: {
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  isEditing: boolean;
}) {
  const updatePreference = (key: string, value: boolean) => {
    setFormData({
      ...formData,
      preferences: {
        ...formData.preferences,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
        Preferences
      </h3>

      <div className="space-y-4">
        {[
          {
            key: 'emailNotifications',
            title: 'Email Notifications',
            desc: 'Receive email notifications about event updates and activities'
          },
          {
            key: 'eventRecommendations',
            title: 'Event Recommendations',
            desc: 'Get personalized event recommendations based on your interests'
          },
          {
            key: 'promotionalEmails',
            title: 'Promotional Emails',
            desc: 'Receive promotional emails about special offers and features'
          },
          {
            key: 'publicProfile',
            title: 'Public Profile',
            desc: 'Allow others to view your profile information'
          }
        ].map(({ key, title, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 border border-[var(--border-subtle)] bg-[var(--bg)]">
            <div>
              <h4 className="text-sm font-bold text-[var(--fg)] uppercase tracking-wide">
                {title}
              </h4>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                {desc}
              </p>
            </div>
            <label className="inline-flex items-center relative cursor-pointer">
              <input
                type="checkbox"
                checked={formData.preferences[key as keyof typeof formData.preferences]}
                onChange={(e) => updatePreference(key, e.target.checked)}
                disabled={!isEditing}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--bg-card-hover)] peer-focus:outline-none border border-[var(--border-subtle)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--fg-muted)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)] peer-checked:after:bg-white"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
