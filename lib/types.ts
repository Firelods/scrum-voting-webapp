export type FibonacciValue = 0 | 0.5 | 1 | 2 | 3 | 5 | 8 | 13 | 20 | 40 | 100 | null;
export type TimeValue = 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | null;

export interface Participant {
    id: string;
    name: string;
    vote: FibonacciValue;
    timeVote: TimeValue;
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
    timeEstimateHours?: number | null;
    timeEstimateMinutes?: number | null;
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
    timeEstimationEnabled: boolean;
    timerSeconds: number | null;
    timerStartedAt: number | null;
    createdAt: number;
    jiraBaseUrl?: string | null;
}

export interface RoomState {
    room: Room;
    currentParticipantId: string | null;
}
