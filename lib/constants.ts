import type { VoteValue } from "./types";

/**
 * Sentinel value stored for a "?" vote (participant is unsure).
 * It is a real vote (the participant has answered) but it carries no
 * story points, so it is always excluded from statistics and consensus.
 */
export const UNKNOWN_VOTE = -1;

/**
 * Numeric estimation values available on the cards.
 * Every integer from 1 to 13 is available (not only the Fibonacci sequence),
 * plus 0 / 0.5 for trivial work. Stories bigger than 13 should be split.
 */
export const NUMERIC_VOTE_VALUES: number[] = [
    0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
];

/**
 * All the cards displayed to the participants, "?" included.
 */
export const VOTE_VALUES: VoteValue[] = [...NUMERIC_VOTE_VALUES, UNKNOWN_VOTE];

/** True when the vote is the "?" card. */
export function isUnknownVote(value: VoteValue): boolean {
    return value === UNKNOWN_VOTE;
}

/** Keep only the votes that can be used in statistics. */
export function numericVotes(values: (number | null | undefined)[]): number[] {
    return values.filter(
        (v): v is number => v !== null && v !== undefined && v !== UNKNOWN_VOTE
    );
}

/** Label shown on a card / badge for a given vote. */
export function formatVoteValue(value: VoteValue): string {
    return value === null || value === UNKNOWN_VOTE ? "?" : String(value);
}
