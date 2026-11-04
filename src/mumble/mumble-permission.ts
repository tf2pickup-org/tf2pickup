// ChanACL::Perm in Murmur
const traverse = 0x2
const enter = 0x4
const speak = 0x8
const whisper = 0x100
const textMessage = 0x200

export const mumblePermission = {
  enter,
  // what a player needs in their game's channels
  voice: traverse | enter | speak | whisper | textMessage,
} as const
