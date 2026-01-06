/**
 * Shared witty loading messages for all AI processing overlays
 * Used by: LoadingOverlay, AILoadingMessages, batch processing, EditModal, etc.
 */

export const AI_LOADING_MESSAGES = [
  // Classic appraisal humor
  "Consulting the AI oracle...",
  "Teaching robots about antiques...",
  "Summoning appraisal spirits...",
  "Channeling grandma's attic wisdom...",
  "Asking the estate sale gods...",
  "Dusting off the price guides...",
  "Decoding maker's marks...",
  "Cross-referencing with eBay sold...",
  
  // The popular "MCM or just old" style
  "Checking if it's MCM or just old...",
  "Determining: treasure or trash?",
  "Is it vintage or just dusty?",
  "Antique or just antique-looking?",
  "Retro cool or just old school?",
  
  // Pop culture & fun references
  "Consulting the ghost of Antiques Roadshow...",
  "Running it through the time machine...",
  "Checking if this sparks joy AND profit...",
  "Googling with extra AI sauce...",
  "Asking 1000 vintage dealers at once...",
  "Scanning for hidden signatures...",
  
  // Market & value humor
  "Cross-referencing auction archives...",
  "Crunching auction data...",
  "Looking up what the cool kids collect...",
  "Estimating market value...",
  "Finding comparable sales...",
  "Checking the flip potential...",
  
  // Appraisal process
  "Analyzing vintage vibes...",
  "Squinting at maker's marks...",
  "Examining patina authenticity...",
  "Detecting signs of quality...",
  "Rating the rarity factor...",
  
  // Whimsical
  "Consulting the crystal price ball...",
  "Asking your great-aunt Edna...",
  "Channeling thrift store energy...",
  "Summoning estate sale spirits...",
  "Peering through vintage-tinted glasses...",
];

/**
 * Photo upload loading messages (shorter, action-focused)
 */
export const PHOTO_LOADING_MESSAGES = [
  "Getting your photos...",
  "Loading your treasures...",
  "Preparing your images...",
  "Gathering your finds...",
  "Importing your collection...",
  "Processing your photos...",
  "Receiving your images...",
  "Collecting your snapshots...",
];

/**
 * Helper to get a random message from an array
 */
export const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};
