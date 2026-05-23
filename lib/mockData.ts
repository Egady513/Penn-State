// Mock data for all three surfaces. Replace with Supabase calls in the data phase.

export const EVENT_FACTS = {
  name: 'Drive Out Hunger Golf Outing',
  date: 'August 30, 2026',
  course: 'Beckett Ridge Golf Club',
  courseAddress: '2960 Beckett Ridge Blvd, West Chester, OH 45069',
  benefits: 'Last Mile Food Rescue',
  format: '2-person scramble · 18 holes · shotgun start',
  teamSpots: { taken: 28, total: 36 },
  registrationFee: 100,
  greensFee: 75,
  daysOut: Math.max(0, Math.ceil((new Date('2026-08-30').getTime() - Date.now()) / 86400000)),
}

// Beckett Ridge pars for holes 1-18 (par 72)
export const BECKETT_PARS = [5, 4, 4, 3, 5, 3, 4, 4, 4, 3, 4, 5, 3, 5, 4, 3, 5, 4]

export const SCHEDULE = [
  { time: '8:00 AM', label: 'Check-in opens · breakfast' },
  { time: '8:45 AM', label: 'Pre-round briefing' },
  { time: '9:00 AM', label: 'Shotgun start' },
  { time: '12:30 PM', label: 'Lunch on the course' },
  { time: '3:30 PM', label: 'Dinner & awards' },
]

export const WHATS_INCLUDED = [
  'Greens fee and cart for both golfers',
  'Range balls + practice green',
  'Breakfast and on-course lunch',
  'Dinner and awards reception',
  'Tournament gift bag',
  'Live mobile scoring app',
]

export const REG_PRICING = {
  team: 200,
  addons: [
    { id: 'gimme', label: 'Gimme rope (3 ft)',     desc: 'Use anywhere on the course',   price: 10 },
    { id: 'ctp',   label: 'Closest-to-pin + long drive contest', desc: 'Enter your team',  price: 20 },
    { id: 'oppd',  label: 'Advantage card: share opponent\'s drive', desc: 'One-time card', price: 10 },
    { id: 'front', label: 'Advantage card: play from front tees',    desc: 'One-time card', price: 10 },
  ],
}

export const REG_SPONSORS = {
  eagle:  [{ id: 's1', name: 'Sponsor A' }, { id: 's2', name: 'Sponsor B' }],
  birdie: [{ id: 's3', name: 'Sponsor C' }, { id: 's4', name: 'Sponsor D' }, { id: 's5', name: 'Sponsor E' }],
  par: [
    { id: 's6', name: 'Sponsor F' },  { id: 's7', name: 'Sponsor G' },
    { id: 's8', name: 'Sponsor H' },  { id: 's9', name: 'Sponsor I' },
    { id: 's10', name: 'Sponsor J' }, { id: 's11', name: 'Sponsor K' },
  ],
}

export const REG_DONORS = [
  'Acme Family', 'Bechtel Group', 'Cincinnati Cellars',
  'Dunn Logistics', 'Elliott & Co.', 'Fields Auto',
  'Garrett Estates', 'Hopper Brewing', 'Indigo Print Co.',
  'Jensen Roofing', 'Kepler Marketing', 'Lamar Films',
]

// ── Player app ─────────────────────────────────────────────────────

export const PLAYER_HOLES = BECKETT_PARS.map((par, i) => ({
  n: i + 1,
  par,
  contest: [3, 12].includes(i + 1) ? 'ctp' as const
         : [6, 16].includes(i + 1) ? 'ld' as const
         : null,
}))

export const PLAYER_TEAMS = [
  { id: 't01', name: 'Roar Lions Roar' },
  { id: 't02', name: 'Beaver Stadium Boys' },
  { id: 't07', name: 'Nittany Drivers' },
  { id: 't08', name: 'Lions of Cincy' },
  { id: 't09', name: 'Cincy Slicers' },
  { id: 't10', name: 'Penn State Putt-Heads' },
  { id: 't11', name: 'Greens & Garnet' },
  { id: 't12', name: 'Mount Nittany Maulers' },
]

export const MY_TEAM = {
  id: 't07',
  name: 'Nittany Drivers',
  startingHole: 7,
  players: [
    { initials: 'JM', name: 'Jamie Miller' },
    { initials: 'EG', name: 'Eddie Gady' },
  ],
  scores: { 7: 4, 8: 3, 9: 5, 10: 4, 11: 6, 12: 2, 13: 4, 14: 4, 15: 5 } as Record<number, number>,
  mulligans: { 7: 1, 8: 0, 9: 2, 10: 0, 11: 1, 12: 0, 13: 0 } as Record<number, number>,
  contests: {
    ctp: { paid: true,  price: 10 },
    ld:  { paid: false, price: 10 },
  },
}

export const MY_FOURSOME = [
  { name: 'Nittany Drivers', players: 'J. Miller · E. Gady', you: true },
  { name: 'Lions of Cincy',  players: 'D. Park · M. Sato',   you: false },
]

export const LEADERBOARD = [
  { rank: 1,  name: 'Roar Lions Roar',        players: 'M. Cole · S. Park',   thru: 18, toPar: -6, you: false },
  { rank: 2,  name: 'Beaver Stadium Boys',    players: 'A. Webb · R. Howe',    thru: 18, toPar: -4, you: false },
  { rank: 3,  name: 'Joe Pa Putters',         players: 'L. Kim · T. Brown',    thru: 18, toPar: -3, you: false },
  { rank: 4,  name: 'Mount Nittany Maulers',  players: 'B. Reyes · K. Wu',     thru: 17, toPar: -1, you: false },
  { rank: 5,  name: 'Old Main Hackers',       players: 'P. Lee · C. Diaz',     thru: 16, toPar: -1, you: false },
  { rank: 6,  name: 'Berkey Birdies',         players: 'H. Stone · J. Yu',     thru: 13, toPar:  0, you: false },
  { rank: 7,  name: 'Nittany Drivers',        players: 'J. Miller · E. Gady',  thru:  9, toPar: +1, you: true  },
  { rank: 8,  name: 'Lions of Cincy',         players: 'D. Park · M. Sato',    thru:  7, toPar: +2, you: false },
  { rank: 9,  name: 'Cincy Slicers',          players: 'F. Ortiz · N. Aziz',   thru: 12, toPar: +3, you: false },
  { rank: 10, name: 'Penn State Putt-Heads',  players: 'R. Tan · M. Khan',     thru: 12, toPar: +5, you: false },
  { rank: 11, name: 'Greens & Garnet',        players: 'E. Quinn · L. Adler',  thru: 11, toPar: +6, you: false },
  { rank: 12, name: 'Lion Cubs',              players: 'I. Pham · O. Murphy',  thru: 10, toPar: +7, you: false },
]

export const OWE_ITEMS = [
  { id: 'reg',   label: 'Registration · 2 golfers',  total: 200, paid: true,  via: 'Zeffy' },
  { id: 'mull',  label: 'Mulligans · 4 used',         total: 8,   paid: false, via: undefined },
  { id: 'gimme', label: 'Gimme rope',                  total: 10,  paid: true,  via: 'Tent' },
  { id: 'ctp',   label: 'Closest-to-pin entry',        total: 20,  paid: true,  via: 'Tent' },
  { id: 'ld',    label: 'Long-drive entry',             total: 20,  paid: false, via: undefined },
  { id: 'adv',   label: 'Advantage cards · 2',          total: 20,  paid: false, via: undefined },
  { id: 'raff',  label: 'Raffle tickets · 5',           total: 15,  paid: false, via: undefined },
]

export const PLAYER_SPONSORS = {
  eagle:  [{ name: 'Sponsor A', amount: 2500, hole: 4 },  { name: 'Sponsor B', amount: 2500, hole: 14 }],
  birdie: [{ name: 'Sponsor C', amount: 1000, hole: 2 },  { name: 'Sponsor D', amount: 1000, hole: 8 },  { name: 'Sponsor E', amount: 1000, hole: 16 }],
  par:    [{ name: 'Sponsor F', amount: 500, hole: 1 },   { name: 'Sponsor G', amount: 500, hole: 5 },
           { name: 'Sponsor H', amount: 500, hole: 11 },  { name: 'Sponsor I', amount: 500, hole: 13 }],
}

export const ANNOUNCEMENT = {
  body: 'Lunch is at the turn — pick it up at hole 10.',
  posted: '8:42 AM · Eddie',
}

export const CHAT_MESSAGES = [
  { id: 'm1',  from: 'Eddie',     role: 'admin',  teamId: null,  time: '8:42 AM',  body: 'Lunch is at the turn — pick it up at hole 10. Sandwiches, chips, water.', pinned: true,  me: false },
  { id: 'm2',  from: 'M. Cole',   role: 'player', teamId: 't01', time: '8:51 AM',  body: 'Thanks Eddie! Cart 12 is missing keys btw.', pinned: false, me: false },
  { id: 'm3',  from: 'Eddie',     role: 'admin',  teamId: null,  time: '8:53 AM',  body: 'Walking them out now. Sorry about that.', pinned: false, me: false },
  { id: 'm4',  from: 'A. Webb',   role: 'player', teamId: 't02', time: '9:08 AM',  body: "Shotgun went off! Good luck everyone, let's raise some money", pinned: false, me: false },
  { id: 'm5',  from: 'J. Miller', role: 'player', teamId: 't07', time: '10:18 AM', body: 'Just stuck one to 4 feet on 8 — Nittany Drivers are coming for #1', pinned: false, me: true },
  { id: 'm6',  from: 'Eddie',     role: 'admin',  teamId: null,  time: '10:30 AM', body: 'Reminder — dinner & awards in the clubhouse at 3:30. Bring your appetite.', pinned: false, me: false },
]

// ── Admin ────────────────────────────────────────────────────────

export const ADMIN_MONEY = {
  netToLMFR: 8420,
  grossRaised: 12800,
  expenses: 4380,
  teamsRegistered: 28,
  teamsPaid: 24,
  teamsUnpaid: 4,
  sponsorsCommitted: 10,
  sponsorDollarsCommitted: 9500,
}

export const ADMIN_TEAMS = [
  { id: 't01', name: 'Roar Lions Roar',       captain: 'M. Cole',   email: 'mcole@example.com',   paid: true,  startHole: 1 },
  { id: 't02', name: 'Beaver Stadium Boys',   captain: 'A. Webb',   email: 'awebb@example.com',   paid: true,  startHole: 3 },
  { id: 't03', name: 'Joe Pa Putters',        captain: 'L. Kim',    email: 'lkim@example.com',    paid: true,  startHole: 5 },
  { id: 't07', name: 'Nittany Drivers',       captain: 'J. Miller', email: 'jmiller@psu.edu',     paid: false, startHole: 7 },
  { id: 't08', name: 'Lions of Cincy',        captain: 'D. Park',   email: 'dpark@example.com',   paid: true,  startHole: 7 },
  { id: 't09', name: 'Cincy Slicers',         captain: 'F. Ortiz',  email: 'fortiz@example.com',  paid: false, startHole: 9 },
  { id: 't10', name: 'Penn State Putt-Heads', captain: 'R. Tan',    email: 'rtan@example.com',    paid: true,  startHole: 11 },
  { id: 't11', name: 'Greens & Garnet',       captain: 'E. Quinn',  email: 'equinn@example.com',  paid: true,  startHole: 13 },
]

export const ADMIN_SPONSORS = [
  { id: 's1', name: 'Sponsor A', tier: 'eagle'  as const, amount: 2500, hole: 4  },
  { id: 's2', name: 'Sponsor B', tier: 'eagle'  as const, amount: 2500, hole: 14 },
  { id: 's3', name: 'Sponsor C', tier: 'birdie' as const, amount: 1000, hole: 2  },
  { id: 's4', name: 'Sponsor D', tier: 'birdie' as const, amount: 1000, hole: 8  },
  { id: 's5', name: 'Sponsor E', tier: 'birdie' as const, amount: 1000, hole: 16 },
  { id: 's6', name: 'Sponsor F', tier: 'par'    as const, amount: 500,  hole: 1  },
  { id: 's7', name: 'Sponsor G', tier: 'par'    as const, amount: 500,  hole: 5  },
]

export const ADMIN_HOLES = BECKETT_PARS.map((par, i) => ({
  n: i + 1,
  par,
  contest: [3, 12].includes(i + 1) ? 'ctp' as const
         : [6, 16].includes(i + 1) ? 'ld'  as const
         : null,
}))

export const ADMIN_CATALOG = {
  base: { id: 'reg',   label: 'Team registration', price: 100, perPerson: true,  desc: '$100/golfer' },
  team: [
    { id: 'mull',  label: 'Mulligan',                    price: 2,  desc: 'Max 2 per hole · $2 each' },
    { id: 'gimme', label: 'Gimme rope (3 ft)',            price: 10, desc: 'Use anywhere on the course' },
    { id: 'oppd',  label: "Use opponent's drive",          price: 10, desc: 'One-time advantage card' },
    { id: 'front', label: 'Play from front tees',          price: 10, desc: 'One-time advantage card' },
  ],
  person: [
    { id: 'raff',  label: 'Raffle ticket', price: 5,  desc: 'Per person' },
    { id: 'ld',    label: 'Long-drive entry',   price: 10, desc: 'Per person' },
    { id: 'ctp',   label: 'Closest-to-pin entry', price: 10, desc: 'Per person' },
  ],
}

export const ADMIN_ROSTERS: Record<string, { name: string; email: string }[]> = {
  t01: [{ name: 'M. Cole',   email: 'mcole@example.com'   }, { name: 'J. Pearce', email: 'jpearce@example.com' }],
  t02: [{ name: 'A. Webb',   email: 'awebb@example.com'   }, { name: 'R. Howe',   email: 'rhowe@example.com'   }],
  t03: [{ name: 'L. Kim',    email: 'lkim@example.com'    }, { name: 'T. Brown',  email: 'tbrown@example.com'  }],
  t07: [{ name: 'J. Miller', email: 'jmiller@psu.edu'     }, { name: 'E. Gady',   email: 'eddie@psu-cincy.org' }],
  t08: [{ name: 'D. Park',   email: 'dpark@example.com'   }, { name: 'M. Sato',   email: 'msato@example.com'   }],
  t09: [{ name: 'F. Ortiz',  email: 'fortiz@example.com'  }, { name: 'N. Aziz',   email: 'naziz@example.com'   }],
  t10: [{ name: 'R. Tan',    email: 'rtan@example.com'    }, { name: 'M. Khan',   email: 'mkhan@example.com'   }],
  t11: [{ name: 'E. Quinn',  email: 'equinn@example.com'  }, { name: 'L. Adler',  email: 'ladler@example.com'  }],
}

export const ADMIN_DONORS = [
  { id: 'd1',  name: 'Acme Family',        item: 'Cabin weekend, Hocking Hills',     value: 800 },
  { id: 'd2',  name: 'Bechtel Group',      item: 'Wine pairing dinner for 6',         value: 600 },
  { id: 'd3',  name: 'Cincinnati Cellars', item: 'Mixed case of Ohio wines',          value: 250 },
  { id: 'd4',  name: 'Dunn Logistics',     item: 'Tailgate package',                  value: 400 },
  { id: 'd5',  name: 'Elliott & Co.',      item: 'Tax-prep certificate',              value: 350 },
  { id: 'd6',  name: 'Fields Auto',        item: 'Detailing for two cars',            value: 300 },
  { id: 'd7',  name: 'Garrett Estates',    item: 'Charcuterie board, hand-crafted',   value: 180 },
  { id: 'd8',  name: 'Hopper Brewing',     item: 'Brewery tour for 12',               value: 220 },
  { id: 'd9',  name: 'Indigo Print Co.',   item: 'Custom letterpress notecards',      value: 140 },
  { id: 'd10', name: 'Jensen Roofing',     item: 'Gutter cleaning + inspection',      value: 320 },
]

export const ADMIN_SCHEDULE = [
  { id: 's1', time: '8:00 AM',  label: 'Check-in opens',      detail: 'Breakfast in the clubhouse', announce: true  },
  { id: 's2', time: '8:45 AM',  label: 'Pre-round briefing',  detail: 'At the 1st tee',              announce: true  },
  { id: 's3', time: '9:00 AM',  label: 'Shotgun start',       detail: 'Carts to your starting hole', announce: false },
  { id: 's4', time: '12:30 PM', label: 'Lunch on the course', detail: 'Pick up at hole 10',           announce: true  },
  { id: 's5', time: '3:30 PM',  label: 'Dinner & awards',     detail: 'In the clubhouse',             announce: true  },
]

export type AdminTeam = typeof ADMIN_TEAMS[number]
export type AdminSponsor = typeof ADMIN_SPONSORS[number]
export type AdminHole = typeof ADMIN_HOLES[number]
export type PlayerHole = typeof PLAYER_HOLES[number]
