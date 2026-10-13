#!/usr/bin/env node
/**
 * One-off import for 4 completed campus events (NSS World Population Day 2026,
 * Mrittika: Ganesh Clay Art Fest, Hyderabad City Inter-College Sports & Quiz
 * Competitions 2026, Breach Point II: The National Cybersecurity CTF) sourced
 * from real event documents/posters/listings. Run this once against
 * production with real admin credentials - it cannot run from a sandbox with
 * no Firebase/session access.
 *
 * Usage:
 *   FESTORA_BASE_URL=https://your-production-domain \
 *   SYSTEM_ADMIN_USERNAME=... \
 *   SYSTEM_ADMIN_PASSWORD=... \
 *   node scripts/import-showcase-events.mjs
 *
 * Add --dry-run to print the payloads without sending any requests.
 *
 * NOTE: /api/admin/create-event emails the given organizer address real
 * dashboard-login credentials for each new event. All 4 events below use
 * pranaytadakamalla@gmail.com as the organizer contact (per explicit
 * instruction), since no official NSS-MRUH / Physiotherapy-dept / Cyber
 * Security-dept email was available in the source material. Swap
 * ORGANIZER_EMAIL below if you'd rather attribute them to real department
 * inboxes.
 *
 * The Breach Point II entry was sourced from web search (Internshala /
 * CTFtime / hackculture.io listings), not an official poster - its exact
 * start time, registration fee and team-size limits are unconfirmed. Verify
 * against breachpoint.live before treating it as authoritative.
 */

const BASE_URL = process.env.FESTORA_BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.SYSTEM_ADMIN_USERNAME;
const PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD;
const DRY_RUN = process.argv.includes('--dry-run');

const ORGANIZER_EMAIL = 'pranaytadakamalla@gmail.com';

const events = [
  {
    title: 'World Population Day 2026',
    description:
      "NSS-MRUH's World Population Day 2026 observance at Malla Reddy University, Hyderabad, held in partnership with Festora as the event's management and registration platform. The program brought together student volunteers for an awareness and community-engagement drive marking World Population Day, coordinated by the National Service Scheme unit at Malla Reddy University under faculty advisor Dr. V. Sridhar, Assistant Professor.",
    shortDescription: "NSS-MRUH's World Population Day 2026 awareness drive at Malla Reddy University.",
    image: '',
    startDate: '2026-07-10T04:30:00.000Z',
    endDate: '2026-07-10T11:30:00.000Z',
    venue: 'Malla Reddy University, Maisammaguda, Hyderabad',
    venueType: 'physical',
    location: {
      address: 'Block-7, Malla Reddy University, Maisammaguda',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    price: 0,
    currency: 'INR',
    category: 'Social',
    categories: ['Social', 'Education'],
    tags: ['NSS', 'World Population Day', 'MRUH', 'Community Service'],
    badges: ['Completed', 'NSS'],
    organizer: { name: 'National Service Scheme - MRUH (NSS-MRUH)', email: ORGANIZER_EMAIL },
    organizationName: 'National Service Scheme, Malla Reddy University',
    organizationDescription:
      'NSS-MRUH mobilizes student volunteers for community service and social-awareness initiatives at Malla Reddy University.',
    isTeamEvent: false,
    status: 'completed',
    featured: false,
  },
  {
    title: 'Mrittika: Ganesh Clay Art Fest',
    description:
      "MRUH NSS Unit's Ganesh Chaturthi celebration of creativity and tradition - Mrittika: Ganesh Clay Art Fest, themed \"Clay in Hands, Devotion in Heart.\" Open to all students, participants shaped their own clay Ganesh idols, with certificates for every participant and prizes for the top creations.",
    shortDescription: "NSS MRUH's Ganesh Chaturthi clay-art celebration - shape devotion, showcase creativity.",
    image: '/events/mrittika-ganesh-clay-art-fest.jpg',
    startDate: '2026-09-12T04:30:00.000Z',
    endDate: '2026-09-12T10:30:00.000Z',
    venue: 'Malla Reddy University, Maisammaguda, Hyderabad',
    venueType: 'physical',
    location: {
      address: 'Block-7, Malla Reddy University, Maisammaguda',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    price: 30,
    currency: 'INR',
    category: 'Arts & Culture',
    categories: ['Arts & Culture', 'Social'],
    tags: ['NSS', 'Ganesh Chaturthi', 'Clay Art', 'MRUH'],
    badges: ['Completed', 'Certificate', 'Prizes'],
    organizer: { name: 'National Service Scheme - MRUH (NSS-MRUH)', email: ORGANIZER_EMAIL },
    organizationName: 'National Service Scheme, Malla Reddy University',
    organizationDescription:
      'NSS-MRUH mobilizes student volunteers for community service and social-awareness initiatives at Malla Reddy University.',
    isTeamEvent: false,
    status: 'completed',
    featured: false,
  },
  {
    title: 'Hyderabad City Inter-College Sports & Quiz Competitions 2026',
    description:
      "A Hyderabad-wide inter-college sports and quiz meet organized by the Department of Physiotherapy, School of Allied and Health Care Sciences at Malla Reddy University, open to BPT & MPT students from physiotherapy colleges across the city. The lineup spanned men's and women's cricket, kabaddi, table tennis, chess, carrom, throwball and tennikoit, athletic events (100m sprint, shot put, long jump), and a quiz competition covering physiotherapy, sports science, general knowledge, current affairs and health sciences. Registration was free, with trophies, Best Performer awards and participation certificates for all.",
    shortDescription: "Inter-college sports & quiz meet for BPT/MPT students across Hyderabad, hosted by MRUH's Dept. of Physiotherapy.",
    image: '/events/mruh-sports-quiz-2026.jpg',
    startDate: '2026-07-25T02:30:00.000Z',
    endDate: '2026-07-25T10:30:00.000Z',
    venue: 'Malla Reddy University, Maisammaguda, Hyderabad',
    venueType: 'physical',
    location: {
      address: 'Malla Reddy University, Maisammaguda, Kompally',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    price: 0,
    currency: 'INR',
    category: 'Sports',
    categories: ['Sports', 'Education'],
    tags: ['Inter-College', 'Sports', 'Quiz', 'Physiotherapy', 'MRUH'],
    badges: ['Completed', 'Free', 'Trophies & Certificates'],
    organizer: {
      name: 'Department of Physiotherapy, School of Allied and Health Care Sciences - MRUH',
      email: ORGANIZER_EMAIL,
    },
    organizationName: 'Malla Reddy University - Department of Physiotherapy',
    organizationDescription:
      'School of Allied and Health Care Sciences, Malla Reddy University - Department of Physiotherapy.',
    requirements: ['Valid college ID card', 'Bonafide certificate issued by the institution'],
    isTeamEvent: false,
    status: 'completed',
    featured: false,
  },
  {
    // Sourced via web search (Internshala/CTFtime/hackculture.io listings) -
    // no official poster was supplied. Verify dates/price/team size against
    // breachpoint.live before treating this as authoritative.
    title: 'Breach Point II: The National Cybersecurity CTF',
    description:
      "The second edition of Breach Point, the Department of Cyber Security at Malla Reddy University's national CTF - a 36-hour continuous online cybersecurity challenge spanning 13 security domains. Registrations and the challenge platform were hosted at breachpoint.live.",
    shortDescription: "MRUH Dept. of Cyber Security's 36-hour national online CTF across 13 security domains.",
    image: '',
    startDate: '2026-10-04T00:00:00.000Z',
    endDate: '2026-10-05T12:00:00.000Z',
    venue: 'Online (breachpoint.live)',
    venueType: 'virtual',
    virtualLink: 'https://breachpoint.live',
    location: {
      address: 'Online',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    price: 0,
    currency: 'INR',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Competition', 'Hackathon'],
    tags: ['CTF', 'Cybersecurity', 'MRUH', 'Breach Point'],
    badges: ['Completed', 'Online', '13 Domains'],
    organizer: { name: 'Department of Cyber Security - MRUH', email: ORGANIZER_EMAIL },
    organizationName: 'Malla Reddy University - Department of Cyber Security',
    organizationDescription: 'Department of Cyber Security, Malla Reddy University.',
    isTeamEvent: true,
    status: 'completed',
    featured: false,
  },
];

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/__admin_session=[^;]+/);
  return match ? match[0] : null;
}

async function main() {
  if (DRY_RUN) {
    console.log(JSON.stringify(events, null, 2));
    return;
  }

  if (!USERNAME || !PASSWORD) {
    console.error('Set SYSTEM_ADMIN_USERNAME and SYSTEM_ADMIN_PASSWORD (and FESTORA_BASE_URL) before running.');
    process.exit(1);
  }

  console.log(`Logging into ${BASE_URL} as admin...`);
  const loginRes = await fetch(`${BASE_URL}/api/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!loginRes.ok) {
    console.error('Admin login failed:', loginRes.status, await loginRes.text());
    process.exit(1);
  }

  const cookie = extractCookie(loginRes.headers.get('set-cookie'));
  if (!cookie) {
    console.error('Login succeeded but no session cookie was returned.');
    process.exit(1);
  }

  for (const event of events) {
    console.log(`\nCreating: ${event.title}`);
    const res = await fetch(`${BASE_URL}/api/admin/create-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(event),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`  Failed (${res.status}):`, data.error || data);
      continue;
    }
    console.log(`  Created with slug "${data.slug}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
