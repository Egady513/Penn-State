// Static content for game-day perks, prizes, and challenges — shared
// between the confirmation email (lib/registrationEmail.ts) and the
// broadcast-email admin page, so both always describe the same event.
//
// Update THIS file (not the email templates) when perks or prize amounts
// change. Sponsor and donor names are NOT here — those are pulled live
// from the database so they never go stale.

export const GET_THERE_EARLY = [
  {
    title: '“It’s Working Out” complimentary stretching',
    body: 'Warm up before you tee off with free stretching from It’s Working Out.',
  },
]

// Moved from the morning to post-round (2026-08-21) — starts at noon as
// teams come off the course.
export const AFTER_ROUND = [
  {
    title: '“Sink It, Keep It” putting green challenge',
    body: 'Starting at noon as teams finish their round, presented by Courtesy Automotive. $20 for 2 putts. Sink either one into a bottle of liquor on the putting green and it’s yours to take home (one bottle per person).',
  },
]

// Included with every registration (not an on-course sponsor activation) —
// shown as its own callout near "what you signed up for," not buried in
// the hole-perks list below.
export const DRINK_TICKET = {
  title: 'One drink ticket, on us',
  body: 'Every registered golfer gets a free drink ticket to redeem on the course.',
}

export const HOLE_PERKS = [
  {
    title: '513Sips · Hole 10',
    body: 'Handing out water and Arnold Palmers to keep you refreshed.',
  },
  {
    title: 'Zeek’s Power Clean Wipes · Hole 5',
    body: '$5 for a 5-pack of wipes, and what you buy decides how you play the hole. Buy one pack and your team gets one regular golf shot plus one swing with a shovel. Buy two packs and both players hit regular golf shots. Buy none and you’re both swinging shovels. They’ll also have 30-packs for sale during and after the round, and proceeds are split with Last Mile Food Rescue.',
  },
]

export const TOURNAMENT_WINNERS = [
  { place: '1st Place', prize: '$50 Dick’s Gift Cards & Pro-V1s' },
  { place: '2nd Place', prize: 'Hamilton County Parks Pass & a round at Meadowlinks' },
]

type HoleChallenge = {
  name: string
  prizes: { place: string; prize: string }[]
  /** Used instead of a place-prize list for flat-entry challenges (e.g. Bucket Golf). */
  description: string
}

export const HOLE_CHALLENGES: HoleChallenge[] = [
  {
    name: 'Closest to the Pin',
    prizes: [
      { place: '1st', prize: 'Free round for 4 at Legendary Run' },
      { place: '2nd', prize: '$100 to Go Play Golf' },
    ],
    description: '',
  },
  {
    name: 'Longest Drive',
    prizes: [
      { place: '1st', prize: '$120 gift card to Another 9' },
      { place: '2nd', prize: '$25 Dick’s gift card' },
    ],
    description: '',
  },
  {
    name: 'Bucket Golf Challenge (Hole 1)',
    prizes: [],
    description: '$5 a shot, no cap. Three buckets: land the closest and take 1 stroke off your score on that hole, the middle takes 2 off, the farthest takes 3 off.',
  },
  {
    name: 'Beat the Pro (Hole 13)',
    prizes: [],
    description: 'New this year, presented by BackSwing Golf Events. Go head-to-head with a touring lady pro in a fun spin on closest-to-the-pin, with a Bad Birdie gift card on the line. If your whole team donates, you get the chance to improve your score. Do you have what it takes to beat the pro?',
  },
]

// Raffle prize bundles, curated from the print raffle deck (Tournament/Golf
// Outing_2026 print.pptx) and confirmed with Eddie 2026-08-17. This is the
// source of truth for the confirmation email's raffle section — NOT the
// `donor` table, since bundles group multiple donors together with a
// combined value that the flat donor rows can't represent on their own.
// Add a new line here when a new donation comes in; nothing to migrate.
export type RaffleBundle = { name: string; credit: string; splitNote?: string; value: string }

export const RAFFLE_BUNDLES: RaffleBundle[] = [
  { name: 'Cooper’s Hawk Wine & Tasting', credit: 'Cooper’s Hawk', value: '$200' },
  { name: 'Restaurant Bundle', credit: 'Dewey’s Pizza ($25 gift card) & Skyline ($50 gift basket)', value: '$75' },
  { name: 'Health & Family Bundle', credit: 'It’s Working Out ($75 gift basket) & Mike’s Carwash ($25 gift card)', value: '$200' },
  { name: 'Florence Y’alls', credit: '4 tickets', value: '$100' },
  { name: 'Bourbon & Cigar Bundle', credit: 'Greater Cincinnati Penn State Alumni (2 PSU Cincy bourbon glasses & bourbon)', splitNote: 'Split between 2 winners', value: '$150' },
  { name: 'Jim Beam Bundle', credit: 'Jim Beam (cast iron skillet & grill set)', value: '$75' },
  { name: 'Jewelry Bundle', credit: 'Kendra Scott', splitNote: 'Split between 3 winners', value: '$225' },
  { name: 'Pins & Aces Mystery Bundle', credit: 'Pins & Aces', value: '$100' },
  { name: 'PSU Bundle', credit: 'Soar Speakers (PSU Bluetooth speaker)', value: '$100' },
]
