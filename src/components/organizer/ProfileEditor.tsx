'use client';

import { useState } from 'react';
import { Save, Building2, Link as LinkIcon, Instagram, Linkedin, Youtube, Globe, Image as ImageIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface OrganizerProfile {
  id: string;
  name: string;
  subtitle?: string;
  avatar?: string;
  links?: {
    website?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}

interface ProfileEditorProps {
  organizerProfile: OrganizerProfile | null;
  auth: { username: string };
}

export default function ProfileEditor({ organizerProfile, auth }: ProfileEditorProps) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [name, setName] = useState(organizerProfile?.name || '');
  const [subtitle, setSubtitle] = useState(organizerProfile?.subtitle || '');
  const [avatar, setAvatar] = useState(organizerProfile?.avatar || '');
  const [links, setLinks] = useState({
    website: organizerProfile?.links?.website || '',
    instagram: organizerProfile?.links?.instagram || '',
    linkedin: organizerProfile?.links?.linkedin || '',
    youtube: organizerProfile?.links?.youtube || ''
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const response = await fetch(`/api/organizer/profile/update?username=${encodeURIComponent(auth.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subtitle,
          avatar,
          links
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSaveMessage('Profile updated successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setSaveMessage('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--bg)]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[var(--gold)]" />
            Organizer Profile
          </h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] transition-colors rounded uppercase tracking-widest font-bold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Spinner inline /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {saveMessage && (
          <div className={`p-4 text-sm font-bold uppercase tracking-wider rounded border ${
            saveMessage.includes('error') || saveMessage.includes('Failed')
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-green-500/10 border-green-500/30 text-green-400'
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold block mb-1.5">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="e.g. Festora Events"
              />
            </div>
            
            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold block mb-1.5">Subtitle / Tagline</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="e.g. Creating unforgettable tech experiences"
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-2 mb-1.5">
                <ImageIcon className="w-3 h-3" /> Avatar URL
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--fg)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-[var(--primary)]" />
            Social Links
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-2 mb-1.5">
                <Globe className="w-3 h-3" /> Website
              </label>
              <input
                type="url"
                value={links.website}
                onChange={(e) => setLinks(prev => ({ ...prev, website: e.target.value }))}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-2 mb-1.5">
                <Instagram className="w-3 h-3" /> Instagram
              </label>
              <input
                type="url"
                value={links.instagram}
                onChange={(e) => setLinks(prev => ({ ...prev, instagram: e.target.value }))}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-2 mb-1.5">
                <Linkedin className="w-3 h-3" /> LinkedIn
              </label>
              <input
                type="url"
                value={links.linkedin}
                onChange={(e) => setLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-2 mb-1.5">
                <Youtube className="w-3 h-3" /> YouTube
              </label>
              <input
                type="url"
                value={links.youtube}
                onChange={(e) => setLinks(prev => ({ ...prev, youtube: e.target.value }))}
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--gold)] outline-none transition-colors"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
