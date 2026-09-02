/**
 * Payment utilities for Festora
 * Now uses Next.js API routes instead of Cloud Functions (FREE!)
 */

import { auth } from './firebase';
import type { CashfreeCheckoutOptions, CashfreeCheckoutResult, CashfreeInstance } from '../types/firestore';
import type { Event } from '../types/event';

export interface CreatePaymentOrderData {
  eventId: string;
  quantity: number;
  teamData?: {
    teamName: string;
    members: Array<{
      name: string;
      email: string;
      phone: string;
      rollNumber?: string;
      year?: string;
      section?: string;
      school?: string;
      college?: string;
      department?: string;
    }>;
    college?: string;
    department?: string;
  };
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  orderToken?: string;
  totalAmount: number;
  cashfreeOrderId?: string;
  paymentSessionId?: string;
  isFree?: boolean;
  error?: string;
}

export interface CheckInData {
  ticketId: string;
  eventId: string;
}

export interface TicketData {
  id: string;
  ticketId: string;
  orderId: string;
  eventId: string;
  userId: string;
  qrCodeData: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  ticketNumber: number;
  totalTickets: number;
  createdAt: string;
  eventData?: Partial<Event>;
  teamInfo?: {
    teamName: string;
    memberName: string;
    memberEmail: string;
    memberPhone: string;
    isTeamEvent: boolean;
  };
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  // Additional fields used in UI
  ticketType?: string;
  price?: number;
  status?: string;
  tierName?: string;
  tierPrice?: number;
}

/**
 * Create a payment order using Next.js API route (FREE!)
 */
export async function createPaymentOrder(data: CreatePaymentOrderData): Promise<PaymentOrderResponse> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Please log in to continue with your purchase");
    }

    // Wait for the user to be fully loaded
    await new Promise((resolve) => {
      if (user.emailVerified !== undefined) {
        resolve(user);
      } else {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
          if (authUser) {
            unsubscribe();
            resolve(authUser);
          }
        });
      }
    });

    // Get the Firebase ID token for authentication with force refresh
    const idToken = await user.getIdToken(true);

    const response = await fetch('/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment API error:', errorData);
      throw new Error(errorData.error || 'Failed to create payment order');
    }

    const result = await response.json();
    return result as PaymentOrderResponse;
  } catch (error: unknown) {
    console.error('Error creating payment order:', error);

    // Provide more specific error messages
    if ((error instanceof Error ? error.message : String(error)).includes('authentication')) {
      throw new Error('Authentication failed. Please log in again and try.');
    }

    if (error instanceof Error && error.message.includes('transactions are not enabled')) {
      throw new Error('Payment system is currently being configured. Please try again later or contact support.');
    }

    if (error instanceof Error && error.message.includes('payment gateway')) {
      throw new Error('Payment service is temporarily unavailable. Please try again in a few minutes.');
    }

    throw new Error(`Payment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initialize Cashfree payment with your production configuration
 */
export function initializeCashfreePayment(
  paymentSessionId: string,
  orderId: string,
  customerDetails?: { customerName: string; customerEmail: string; customerPhone: string }
): Promise<CashfreeCheckoutResult> {
  return new Promise((resolve, reject) => {
    // Load Cashfree SDK
    if (!window.Cashfree) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'; // Production SDK
      script.onload = () => initPayment();
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.head.appendChild(script);
    } else {
      initPayment();
    }

    function initPayment() {
      const cashfree: CashfreeInstance = window.Cashfree({
        mode: 'production' // Using production mode with your API keys
      });

      const checkoutOptions: CashfreeCheckoutOptions & { returnUrl?: string; customer?: { name: string; email: string; phone: string } } = {
        paymentSessionId: paymentSessionId,
        redirectTarget: "_self"
      };

      // Add return URL
      checkoutOptions.returnUrl = `${window.location.origin}/order/success?order_id=${orderId}`;

      // Add customer details if provided
      if (customerDetails) {
        checkoutOptions.customer = {
          name: customerDetails.customerName,
          email: customerDetails.customerEmail,
          phone: customerDetails.customerPhone
        };
      }

      // console.log('Initializing Cashfree payment with options:', checkoutOptions);

      cashfree.checkout(checkoutOptions).then((result: CashfreeCheckoutResult) => {
        if (result.error) {
          reject(new Error(result.error.message));
        } else {
          resolve(result);
        }
      }).catch((error: Error) => {
        console.error('Cashfree payment error:', error);
        reject(error);
      });
    }
  });
}

/**
 * Check in a ticket using Next.js API route (FREE!)
 */
export async function checkInTicket(data: { ticketId: string; eventId: string }) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the Firebase ID token for authentication
    const idToken = await user.getIdToken();

    const response = await fetch('/api/tickets/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Check-in failed');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Error checking in ticket:', error);
    throw new Error(`Check-in failed: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Get user's tickets using Next.js API route (FREE!)
 */
export async function getUserTickets(): Promise<TicketData[]> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the Firebase ID token for authentication
    const idToken = await user.getIdToken();

    const response = await fetch(`/api/tickets/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tickets');
    }

    const result = await response.json();
    return result.tickets || [];
  } catch (error: unknown) {
    console.error('Error fetching user tickets:', error);
    throw new Error(`Failed to fetch tickets: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Check if user already has tickets for an event
 */
export async function hasUserTicketsForEvent(eventId: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    // Get the Firebase ID token for authentication
    const idToken = await user.getIdToken();

    const response = await fetch(`/api/tickets/check?eventId=${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
    });

    if (!response.ok) {
      return false; // If API fails, assume no tickets
    }

    const result = await response.json();
    return result.hasTickets || false;
  } catch (error: unknown) {
    console.error('Error checking user tickets:', error);
    return false; // On error, assume no tickets
  }
}

/**
 * Get user's tickets for a specific event
 */
export async function getUserTicketsForEvent(eventId: string): Promise<TicketData[]> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the Firebase ID token for authentication
    const idToken = await user.getIdToken();

    const response = await fetch(`/api/tickets/event/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tickets');
    }

    const result = await response.json();
    return result.tickets || [];
  } catch (error: unknown) {
    console.error('Error fetching user tickets for event:', error);
    return [];
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate gateway fee (3.5% processing fee collected by Cashfree)
 */
export function calculateGatewayFee(amount: number): number {
  if (amount <= 0) return 0;
  return amount * 0.035; // 3.5% gateway fee, exact value
}

/**
 * Calculate total amount including gateway fee
 */
export function calculateTotalWithGatewayFee(amount: number): number {
  return amount + calculateGatewayFee(amount);
}

/**
 * Calculate platform fee (removed - now returns 0)
 */
export function calculatePlatformFee(amount: number): number {
  return 0; // No platform fee
}

/**
 * Check if tickets are available for an event
 */
export function areTicketsAvailable(event: Partial<Event> | null | undefined): boolean {
  if (!event) return false;

  if (!event.isPaid && !event.totalTickets) return true; // Free events with no capacity limit

  const ticketsSold = event.ticketsSold || 0;
  const totalTickets = event.totalTickets || 0;

  return ticketsSold < totalTickets;
}

/**
 * Get remaining tickets count
 */
export function getRemainingTickets(event: Partial<Event> | null | undefined): number {
  if (!event) return 0;

  const ticketsSold = event.ticketsSold || 0;
  const totalTickets = event.totalTickets || 0;

  return Math.max(0, totalTickets - ticketsSold);
}

/**
 * Check if ticket sales are open
 */
export function areTicketSalesOpen(event: Partial<Event> | null | undefined): boolean {
  if (!event || !event.dateTime || !event.dateTime.startDate) {
    return false; // Can't determine sales status without event date
  }

  const now = new Date();
  const eventWithSales = event as Event & { salesStartDate?: string; salesEndDate?: string };
  const salesStart = eventWithSales.salesStartDate ? new Date(eventWithSales.salesStartDate) : new Date(0);
  const salesEnd = eventWithSales.salesEndDate ? new Date(eventWithSales.salesEndDate) : new Date(event.dateTime.startDate);

  return now >= salesStart && now <= salesEnd;
}

// Type declarations for Cashfree SDK
declare global {
  interface Window {
    Cashfree: (config: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}
