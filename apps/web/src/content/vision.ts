/** The statement and its accent words live together deliberately.
 *  They used to be split across index.html and animations.js, so editing
 *  the copy silently broke the highlighting. Kept short by design — this
 *  is the one line the visitor reads slowly, not a paragraph. */
export const VISION = {
  label: 'Why we built it',
  statement:
    'Elite academies measure with camera labs. Grassroots coaches measure with memory. CoachLens gives every coach the same consistent numbers, from a phone they already own.',
  accentWords: ['CoachLens', 'consistent', 'numbers', 'phone'],
} as const;
