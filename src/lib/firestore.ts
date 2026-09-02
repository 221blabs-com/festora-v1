import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";

// Event interface
export interface Event {
  id?: string;
  title: string;
  description: string;
  date: Date | Timestamp;
  location: string;
  category: string;
  price?: number;
  imageUrl?: string;
  organizerId: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

// Add a new event
export async function addEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, "events"), {
      ...eventData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error("Error adding event:", error);
    return { id: null, error };
  }
}

// Get all events
export async function getEvents() {
  try {
    const snapshot = await getDocs(collection(db, "events"));
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
    return { events, error: null };
  } catch (error) {
    console.error("Error getting events:", error);
    return { events: [], error };
  }
}

// Get events by organizer
export async function getEventsByOrganizer(organizerId: string) {
  try {
    const q = query(
      collection(db, "events"),
      where("organizerId", "==", organizerId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
    return { events, error: null };
  } catch (error) {
    console.error("Error getting events by organizer:", error);
    return { events: [], error };
  }
}

// Get a single event by ID
export async function getEvent(eventId: string) {
  try {
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const event = { id: docSnap.id, ...docSnap.data() } as Event;
      return { event, error: null };
    } else {
      return { event: null, error: "Event not found" };
    }
  } catch (error) {
    console.error("Error getting event:", error);
    return { event: null, error };
  }
}

// Update an event
export async function updateEvent(eventId: string, eventData: Partial<Event>) {
  try {
    const docRef = doc(db, "events", eventId);
    await updateDoc(docRef, {
      ...eventData,
      updatedAt: Timestamp.now()
    });
    return { error: null };
  } catch (error) {
    console.error("Error updating event:", error);
    return { error };
  }
}

// Delete an event
export async function deleteEvent(eventId: string) {
  try {
    const docRef = doc(db, "events", eventId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { error };
  }
}

// Get recent events (limit)
export async function getRecentEvents(limitCount: number = 10) {
  try {
    const q = query(
      collection(db, "events"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
    return { events, error: null };
  } catch (error) {
    console.error("Error getting recent events:", error);
    return { events: [], error };
  }
}

// Search events by title or category
export async function searchEvents(searchTerm: string) {
  try {
    // Note: This is a basic search. For more advanced search, consider using Algolia or similar
    const q = query(
      collection(db, "events"),
      where("category", "==", searchTerm)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
    return { events, error: null };
  } catch (error) {
    console.error("Error searching events:", error);
    return { events: [], error };
  }
}
