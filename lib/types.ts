export type FibonacciValue = 0 | 0.5 | 1 | 2 | 3 | 5 | 8 | 13 | 20 | 40 | 100 | null;

export interface Participant {
    id: string;
    name: string;
    vote: FibonacciValue;
    isScumMaster: boolean;
    isOnline: boolean;
    isVoter: boolean;
}

export interface Story {
    id: string;
    title: string;
    jiraLink?: string;
    finalEstimate?: number | null;
    votedAt?: string | null;
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
