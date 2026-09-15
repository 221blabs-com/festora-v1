import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

interface Participant {
  id: string;
  teamName: string;
  member1Name: string;
  member1Email: string;
  member1Phone?: string;
  member1RollNumber?: string;
  member1Year?: string;
  member1College?: string;
  member1Department?: string;
  member2Name: string | null;
  member2Email: string | null;
  member2Phone?: string | null;
  member2RollNumber?: string | null;
  member2Year?: string | null;
  member2College?: string | null;
  member2Department?: string | null;
  member3Name: string | null;
  member3Email: string | null;
  member3Phone?: string | null;
  member3RollNumber?: string | null;
  member3Year?: string | null;
  member3College?: string | null;
  member3Department?: string | null;
  member4Name: string | null;
  member4Email: string | null;
  member4Phone?: string | null;
  member4RollNumber?: string | null;
  member4Year?: string | null;
  member4College?: string | null;
  member4Department?: string | null;
  registrationDate: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  paymentStatus: string;
  university: string;
  department: string;
  college?: string;
  ticketId?: string;
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;
  memberRollNumber?: string;
  memberYear?: string;
  memberCollege?: string;
  memberDepartment?: string;
  isIndividualTicket: boolean;
  memberIndex?: number;
  orderId?: string;
  gender?: string;
  tshirtSize?: string;
  customAnswers?: Record<string, string>;
  dynamicMembers?: Array<{
    name: string;
    email: string;
    phone: string;
    rollNumber?: string;
    year?: string;
    department?: string;
    college?: string;
  }>;
}

interface TeamMember {
  name?: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  year?: string;
  college?: string;
  department?: string;
  university?: string;
  [key: string]: unknown;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const cursorId = searchParams.get('cursor');
    const exportMode = searchParams.get('export') === 'true'; // Fetch all if export is true

    const limitCount = exportMode ? 10000 : limitParam;

    const participants: Participant[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;
    let totalRegistrations = 0;
    let totalCheckedIn = 0;

    // We no longer use strict cache if we are paginating or exporting
    const cacheKey = `participants:${eventId}:${limitCount}:${cursorId || 'none'}`;
    const cached = cache.get<{ participants: Participant[]; count: number; isTeamEvent: boolean; dataSource: string; nextCursor: string | null; hasMore: boolean }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (eventId === 'hyderabad-city-inter-college-sports-quiz-competitions-2026') {
      let collegeQuery = db.collection('college_registrations').limit(limitCount);
      if (cursorId) {
        const cursorDoc = await db.collection('college_registrations').doc(cursorId).get();
        if (cursorDoc.exists) {
          collegeQuery = collegeQuery.startAfter(cursorDoc);
        }
      }

      const collegeSnapshot = await collegeQuery.get();
      if (!collegeSnapshot.empty) {
        hasMore = collegeSnapshot.docs.length === limitCount;
        if (hasMore) {
          nextCursor = collegeSnapshot.docs[collegeSnapshot.docs.length - 1].id;
        }

        collegeSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const events = data.events || [];
          
          events.forEach((ev: any, index: number) => {
            const dynamicMembers = (ev.teamMembers || []).map((m: any) => ({
              name: m.name,
              phone: m.mobile || '',
              email: '',
              college: data.collegeName
            }));
            
            const participant: Participant = {
              id: `${doc.id}_${index}`,
              teamName: `${data.collegeName} - ${ev.sportName}`,
              member1Name: ev.captainName || data.coordinatorName,
              member1Email: ev.captainEmail || data.coordinatorEmail,
              member1Phone: ev.captainMobile || data.coordinatorMobile,
              member1College: data.collegeName,
              member1Department: ev.sportName,
              
              member2Name: null, member2Email: null, member2Phone: null, member2RollNumber: null, member2Year: null, member2College: null, member2Department: null,
              member3Name: null, member3Email: null, member3Phone: null, member3RollNumber: null, member3Year: null, member3College: null, member3Department: null,
              member4Name: null, member4Email: null, member4Phone: null, member4RollNumber: null, member4Year: null, member4College: null, member4Department: null,
              
              registrationDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
              status: 'confirmed',
              checkedIn: false,
              checkedInAt: null,
              paymentStatus: 'completed',
              university: data.collegeName,
              department: `${ev.sportName} (${ev.category})`,
              college: data.collegeName,
              ticketId: doc.id,
              isIndividualTicket: false,
              dynamicMembers
            };
            participants.push(participant);
          });
        });
      }
      
      const responseData = {
        participants,
        count: participants.length,
        totalRegistrations: Math.max(participants.length, totalRegistrations),
        totalCheckedIn: 0,
        isTeamEvent: true,
        dataSource: 'college_registrations',
        nextCursor,
        hasMore
      };
      
      cache.set(cacheKey, responseData, CACHE_TTL.PARTICIPANTS);
      return NextResponse.json(responseData);
    }

    // Get individual participants from tickets collection
    let ticketsQuery = db.collection('tickets').where('eventId', '==', eventId).limit(limitCount);
    
    if (cursorId) {
      const cursorDoc = await db.collection('tickets').doc(cursorId).get();
      if (cursorDoc.exists) {
        ticketsQuery = ticketsQuery.startAfter(cursorDoc);
      }
    } else {
      // First page: get totals using COUNT queries
      try {
        const baseQuery = db.collection('tickets').where('eventId', '==', eventId);
        const [totalSnapshot, checkedInSnapshot, isCheckedInSnapshot] = await Promise.all([
          baseQuery.count().get(),
          baseQuery.where('checkedIn', '==', true).count().get(),
          baseQuery.where('isCheckedIn', '==', true).count().get()
        ]);
        totalRegistrations = totalSnapshot.data().count;
        totalCheckedIn = Math.max(checkedInSnapshot.data().count, isCheckedInSnapshot.data().count);
      } catch (err) {
        console.error('Error fetching count:', err);
      }
    }

    const ticketsSnapshot = await ticketsQuery.get();

    if (!ticketsSnapshot.empty) {
      hasMore = ticketsSnapshot.docs.length === limitCount;
      if (hasMore) {
        nextCursor = ticketsSnapshot.docs[ticketsSnapshot.docs.length - 1].id;
      }

      ticketsSnapshot.docs.forEach(doc => {
        const data = doc.data();

        const memberName = data.teamInfo?.memberName || data.memberName || data.customerDetails?.name || 'Unknown Participant';
        const memberEmail = data.teamInfo?.memberEmail || data.memberEmail || data.customerDetails?.email || 'unknown@email.com';
        const memberPhone = data.teamInfo?.memberPhone || data.memberPhone || data.customerDetails?.phone || '';
        const memberRollNumber = data.teamInfo?.memberRollNumber || data.rollNumber || '';
        const memberYear = data.teamInfo?.memberYear || data.year || '';
        const memberCollege = data.teamInfo?.memberCollege || data.teamInfo?.college || data.college || '';
        const memberDepartment = data.teamInfo?.memberDepartment || data.teamInfo?.department || data.department || '';
        const teamName = data.teamInfo?.teamName || data.teamName || 'Individual';

        const participant: Participant = {
          id: doc.id,
          teamName: teamName,
          member1Name: memberName,
          member1Email: memberEmail,
          member1Phone: memberPhone,
          member1RollNumber: memberRollNumber,
          member1Year: memberYear,
          member1College: memberCollege,
          member1Department: memberDepartment,
          member2Name: null,
          member2Email: null,
          member2Phone: null,
          member2RollNumber: null,
          member2Year: null,
          member2College: null,
          member2Department: null,
          member3Name: null,
          member3Email: null,
          member3Phone: null,
          member3RollNumber: null,
          member3Year: null,
          member3College: null,
          member3Department: null,
          member4Name: null,
          member4Email: null,
          member4Phone: null,
          member4RollNumber: null,
          member4Year: null,
          member4College: null,
          member4Department: null,
          registrationDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          status: data.status || 'confirmed',
          checkedIn: data.isCheckedIn || data.checkedIn || false,
          checkedInAt: data.checkedInAt || null,
          paymentStatus: data.paymentStatus || 'completed',
          university: memberCollege || 'Not specified',
          department: memberDepartment || 'Not specified',
          college: memberCollege,
          ticketId: doc.id,
          memberName: memberName,
          memberEmail: memberEmail,
          memberPhone: memberPhone,
          memberRollNumber: memberRollNumber,
          memberYear: memberYear,
          memberCollege: memberCollege,
          memberDepartment: memberDepartment,
          gender: data.teamInfo?.gender || data.gender || '',
          tshirtSize: data.teamInfo?.tshirtSize || data.tshirtSize || '',
          customAnswers: data.teamInfo?.customAnswers || data.customAnswers || {},
          isIndividualTicket: true
        };

        participants.push(participant);
      });
    }

    // If no tickets found, fallback to orders collection
    if (participants.length === 0 && !cursorId) {
      const ordersQuery = db.collection('orders').where('eventId', '==', eventId).limit(limitCount);
      const ordersSnapshot = await ordersQuery.get();

      if (!ordersSnapshot.empty) {
        hasMore = ordersSnapshot.docs.length === limitCount;
        if (hasMore) {
          nextCursor = ordersSnapshot.docs[ordersSnapshot.docs.length - 1].id;
        }
        
        ordersSnapshot.docs.forEach(doc => {
          const data = doc.data();

          if (data.teamData?.members?.length > 0) {
            data.teamData.members.forEach((member: TeamMember, index: number) => {
              const participant: Participant = {
                id: `${doc.id}_member_${index + 1}`,
                teamName: data.teamData.teamName || `Team ${doc.id.slice(-4)}`,
                member1Name: member.name || `Member ${index + 1}`,
                member1Email: member.email || `member${index + 1}@university.edu`,
                member1Phone: member.phone || '',
                member1RollNumber: member.rollNumber || '',
                member1Year: member.year || '',
                member1College: member.college || '',
                member1Department: member.department || '',
                member2Name: null,
                member2Email: null,
                member2Phone: null,
                member2RollNumber: null,
                member2Year: null,
                member2College: null,
                member2Department: null,
                member3Name: null,
                member3Email: null,
                member3Phone: null,
                member3RollNumber: null,
                member3Year: null,
                member3College: null,
                member3Department: null,
                member4Name: null,
                member4Email: null,
                member4Phone: null,
                member4RollNumber: null,
                member4Year: null,
                member4College: null,
                member4Department: null,
                registrationDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                status: data.status || 'confirmed',
                checkedIn: false,
                checkedInAt: null,
                paymentStatus: data.paymentStatus || 'completed',
                university: member.college || member.university || 'Not specified',
                department: member.department || 'Not specified',
                college: member.college || member.university,
                memberName: member.name,
                memberEmail: member.email,
                memberPhone: member.phone,
                memberRollNumber: member.rollNumber,
                memberYear: member.year,
                memberCollege: member.college,
                memberDepartment: member.department,
                memberIndex: index + 1,
                orderId: doc.id,
                gender: (member as any)?.gender || '',
                tshirtSize: (member as any)?.tshirtSize || '',
                customAnswers: (member as any)?.customAnswers || {},
                isIndividualTicket: false
              };
              participants.push(participant);
            });
          } else {
            const participant: Participant = {
              id: doc.id,
              teamName: 'Individual',
              member1Name: data.customerDetails?.name || 'Participant',
              member1Email: data.customerDetails?.email || 'participant@email.com',
              member2Name: null,
              member2Email: null,
              member3Name: null,
              member3Email: null,
              member4Name: null,
              member4Email: null,
              registrationDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
              status: data.status || 'confirmed',
              checkedIn: data.checkedIn || false,
              checkedInAt: data.checkedInAt || null,
              paymentStatus: data.paymentStatus || 'completed',
              university: 'Not specified',
              department: 'Not specified',
              memberName: data.customerDetails?.name,
              memberEmail: data.customerDetails?.email,
              isIndividualTicket: false
            };
            participants.push(participant);
          }
        });
      }
    }

    // Filter out pending status participants
    const confirmedParticipants = participants.filter(p => {
      const status = (p.status || '').toLowerCase();
      const paymentStatus = (p.paymentStatus || '').toLowerCase();
      return status !== 'pending' && paymentStatus !== 'pending';
    });

    const responseData = {
      participants: confirmedParticipants,
      count: confirmedParticipants.length,
      totalRegistrations,
      totalCheckedIn,
      isTeamEvent: confirmedParticipants.some(p => p.teamName !== 'Individual'),
      dataSource: 'real',
      nextCursor,
      hasMore
    };

    // Cache the result for 2 minutes
    cache.set(cacheKey, responseData, CACHE_TTL.PARTICIPANTS);

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('Error in participants API:', error);
    return NextResponse.json({
      error: 'Failed to fetch participants',
      message: error instanceof Error ? error.message : String(error),
      participants: [],
      count: 0,
      hasMore: false,
      nextCursor: null
    }, { status: 500 });
  }
}

