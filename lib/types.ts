/**
 * A vote: any value available on the cards (see NUMERIC_VOTE_VALUES),
 * UNKNOWN_VOTE (-1) for the "?" card, or null when nothing was voted yet.
 */
export type VoteValue = number | null;

/** @deprecated kept for compatibility, use VoteValue instead */
export type FibonacciValue = VoteValue;

export interface Participant {
    id: string;
    name: string;
    vote: VoteValue;
    isScumMaster: boolean;
    isOnline: boolean;
    isVoter: boolean;
}

export interface Story {
    id: string;
    title: string;
    jiraLink?: string;
    jiraKey?: string;
    finalEstimate?: number | null;
    votedAt?: string | null;
    parentId?: string | null;
    children?: Story[];
}

export interface Room {
    code: string;
    currentStory: Story | null;
    storyQueue: Story[];
    participants: Participant[];
    votingActive: boolean;
    votesRevealed: boolean;
    timerSeconds: number | null;
    timerStartedAt: number | null;
    createdAt: number;
    jiraBaseUrl?: string | null;
}

export interface RoomState {
    room: Room;
    currentParticipantId: string | null;
}
