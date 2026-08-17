// Static content for game-day perks, prizes, and challenges — shared
// between the confirmation email (lib/registrationEmail.ts) and the
// broadcast-email admin page, so both always describe the same event.
//
// Update THIS file (not the email templates) when perks or prize amounts
// change. Sponsor and donor names are NOT here — those are pulled live
// from the database so they never go stale.

export const GET_THERE_EARLY = [
  {
    title: 'Courtesy Automotive Putting Green Challenge',
    body: '$20 for 2 putts. Hit either putt into a bottle of liquor on the putting green and it’s yours to take home (one bottle per person).',
  },
  {
    title: '“It’s Working Out” complimentary stretching',
    body: 'Warm up before you tee off with free stretching from It’s Working Out.',
  },
]

export const HOLE_PERKS = [
  {
    title: 'Free drink ticket',
    body: 'Every registered golfer gets one drink ticket on us. Redeem it on the course.',
  },
  {
    title: '513Sips',
    body: 'Handing out water and Arnold Palmers on the course to keep you refreshed.',
  },
  {
    title: 'Zeek’s Power Clean Wipes',
    body: 'The Cincinnati-made shower wipes you might know from the gym are bringing packs to the course for a fun twist: buy a pack and use it to move your ball closer to the hole, out of the sand, out of the rough, wherever you need it, anywhere on that hole. Part of the proceeds go straight to Last Mile Food Rescue.',
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
    name: 'Bucket Golf Challenge',
    prizes: [],
    description: '$5 entry. Land your shot in the right bucket and shave 1, 2, or 3 strokes off your score on that hole.',
  },
]

// Sponsor names that already get a dedicated perk blurb above (in
// GET_THERE_EARLY / HOLE_PERKS) — excluded from the generic "thank you to
// our sponsors" list so nobody's thanked twice. Keep in sync with the
// titles above. Matched case-insensitively.
export const PERK_SPONSOR_NAMES = ['513sips', 'courtesy automotive', "it's working out", 'power wipes']
