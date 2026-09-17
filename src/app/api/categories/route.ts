import { NextResponse } from 'next/server';

// Static categories data
const categories = [
  { id: 'music', name: 'Music', description: 'Concerts, festivals, live performances' },
  { id: 'tech', name: 'Technology', description: 'Tech meetups, conferences, workshops' },
  { id: 'business', name: 'Business', description: 'Networking, seminars, corporate events' },
  { id: 'sports', name: 'Sports', description: 'Sports events, tournaments, fitness' },
  { id: 'art', name: 'Arts & Culture', description: 'Art exhibitions, cultural events, theater' },
  { id: 'food', name: 'Food & Drink', description: 'Food festivals, tastings, culinary events' },
  { id: 'education', name: 'Education', description: 'Workshops, training, educational seminars' },
  { id: 'health', name: 'Health & Wellness', description: 'Wellness events, health seminars' },
  { id: 'community', name: 'Community', description: 'Local community events, social gatherings' },
  { id: 'other', name: 'Other', description: "Events that don't fit other categories" }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      categories: categories
    });
  } catch (error: unknown) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: `Failed to fetch categories: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
