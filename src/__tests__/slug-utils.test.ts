import { createSlug, generateUniqueSlug, getSlugVariations } from '../lib/slug-utils';

describe('Slug Utilities', () => {
  describe('createSlug', () => {
    it('converts title to lowercase slug', () => {
      const result = createSlug('My Event Title');
      expect(result).toBe('my-event-title');
    });

    it('handles special characters', () => {
      const result = createSlug('Event @ The Park!');
      expect(result).not.toContain('@');
      expect(result).not.toContain('!');
      expect(result).toBe('event-the-park');
    });

    it('handles empty string', () => {
      const result = createSlug('');
      expect(result).toBe('');
    });

    it('handles multiple spaces', () => {
      const result = createSlug('Event   With   Spaces');
      expect(result).toBe('event-with-spaces');
    });
  });

  describe('generateUniqueSlug', () => {
    it('returns base slug when no conflicts', () => {
      const result = generateUniqueSlug('My Event', []);
      expect(result).toBe('my-event');
    });

    it('appends number when slug exists', () => {
      const result = generateUniqueSlug('My Event', ['my-event']);
      expect(result).toBe('my-event-1');
    });

    it('increments number for multiple conflicts', () => {
      const result = generateUniqueSlug('My Event', ['my-event', 'my-event-1', 'my-event-2']);
      expect(result).toBe('my-event-3');
    });
  });

  describe('getSlugVariations', () => {
    it('returns original slug', () => {
      const result = getSlugVariations('my-event');
      expect(result).toContain('my-event');
    });

    it('removes trailing numbers', () => {
      const result = getSlugVariations('my-event-123');
      expect(result).toContain('my-event');
    });
  });
});
