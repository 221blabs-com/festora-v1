/**
 * Convert a string to a URL-friendly slug
 * Example: "Startup Pitch Competition 2025" -> "startup-pitch-competition-2025"
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

/**
 * Generate a unique slug by appending a number if needed
 * This would be used when creating events to ensure uniqueness
 */
export function generateUniqueSlug(title: string, existingSlugs: string[] = []): string {
  const baseSlug = createSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Extract potential slug variations for searching
 * Helps when event titles might have been modified slightly
 */
export function getSlugVariations(slug: string): string[] {
  const variations = [slug];

  // Add version without numbers
  const withoutNumbers = slug.replace(/-\d+$/, '');
  if (withoutNumbers !== slug) {
    variations.push(withoutNumbers);
  }

  // Add version with common year patterns
  const currentYear = new Date().getFullYear();
  if (!slug.includes(currentYear.toString())) {
    variations.push(`${slug}-${currentYear}`);
  }

  return variations;
}
