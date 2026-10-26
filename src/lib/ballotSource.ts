export type BallotSource = "sheet" | "rules";

/**
 * Where ballots come from.
 *   "sheet" : the "Ballots Earned" column of the uploaded file. What the sheet says is what clinicians see,
 *             what the pool counts, and what the draw uses. The app does not recalculate anything.
 *   "rules" : calculated in the app from the numbers under Settings (minimum consults, minimum Patient Satisfaction
 *             Score, and the two thresholds). Use this if you later calculate ballots yourselves (e.g. from Metabase).
 * To switch, change this one word and redeploy.
 */
export const BALLOT_SOURCE: BallotSource = "sheet";
