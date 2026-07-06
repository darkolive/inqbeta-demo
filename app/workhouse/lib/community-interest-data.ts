export const STAY_IN_TOUCH_TOPICS = [
  'Research',
  'Software',
  'Neurodiversity',
  'Community',
  'Events',
  'Updates',
] as const

export type StayInTouchTopic = (typeof STAY_IN_TOUCH_TOPICS)[number]
