/** Publish only genuine testimonials with the contributor's permission. */
export interface LandingStory {
  id: string;
  title?: string;
  quote: string;
  name: string;
  context?: string;
  /** Approved ISO date, used only for optional public membership attribution. */
  joinedAt?: string;
  /** Approved portrait asset/URL; an initials fallback is used when absent. */
  avatar?: string;
}

// Intentionally empty until approved quotes and attribution are supplied.
// Do not publish demo reviews, invented names, photos or ratings.
export const LANDING_STORIES: readonly LandingStory[] = [];
