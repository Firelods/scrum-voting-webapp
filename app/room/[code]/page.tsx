"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeRoom } from "@/lib/hooks/use-realtime-room";
import { submitVote } from "@/app/actions/room-actions";
import { FibonacciCard } from "@/components/fibonacci-card";
import { ParticipantList } from "@/components/participant-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader, Skeleton } from "@/components/ui/loader";
import type { FibonacciValue } from "@/lib/types";
import { Copy, Check, ExternalLink, Settings } from "lucide-react";
import { ScrumMasterPanel } from "@/components/scrum-master-panel";
import { VotingResults } from "@/components/voting-results";
import { VotingTimer } from "@/components/voting-timer";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { PresenceDebug } from "@/components/presence-debug";
import { KickedNotification } from "@/components/kicked-notification";

const FIBONACCI_VALUES: FibonacciValue[] = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export default function RoomPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = use(params);
    const router = useRouter();
    const [participantId, setParticipantId] = useState<string | null>(null);
    const { room, isLoading, isKicked, mutate } = useRealtimeRoom(
        code,
        participantId
    );
    const [selectedVote, setSelectedVote] = useState<FibonacciValue>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiEnabled, setConfettiEnabled] = useState(true);

    // Load confetti preference from localStorage
    useEffect(() => {
        const preference = localStorage.getItem("confetti-enabled");
        if (preference !== null) {
            setConfettiEnabled(preference === "true");
        }
    }, []);

    // Load participant ID from localStorage
    useEffect(() => {
        const storedId = localStorage.getItem(`participant-${code}`);
        if (!storedId) {
            // Redirect to join page if no participant ID
            router.push(`/room/${code}/join`);
            return;
        }
        setParticipantId(storedId);
    }, [code, router]);

    // Update selected vote when room state changes
    useEffect(() => {
        if (room && participantId) {
            const participant = room.participants.find(
                (p) => p.id === participantId
            );
            if (participant) {
                setSelectedVote(participant.vote);
            }
        }
    }, [room, participantId]);

    useEffect(() => {
        if (room?.votesRevealed && confettiEnabled) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 100);
        }
    }, [room?.votesRevealed, confettiEnabled]);

    const toggleConfetti = () => {
        const newValue = !confettiEnabled;
        setConfettiEnabled(newValue);
        localStorage.setItem("confetti-enabled", newValue.toString());
    };

    const handleVote = async (value: FibonacciValue) => {
        if (!participantId || !room?.votingActive) return;

        setSelectedVote(value);
        try {
            await submitVote(code, participantId, value);
            mutate();
        } catch (error) {
            console.error("Failed to submit vote:", error);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/room/${code}/join`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    if (isLoading || !participantId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <Skeleton className="h-10 w-48 mb-2" />
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-40" />
                    </div>

                    {/* Current Story Skeleton */}
                    <Card className="border-2">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-full mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </CardContent>
                    </Card>

                    {/* Main Content */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-48" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-center items-center py-12">
                                        <Loader
                                            size="lg"
                                            className="text-blue-600"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div>
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton
                                                key={i}
                                                className="h-14 w-full"
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Room Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The room you're looking for doesn't exist.
                        </p>
                        <Button
                            onClick={() => router.push("/")}
                            className="w-full"
                        >
                            Go Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentParticipant = room.participants.find(
        (p) => p.id === participantId
    );
    const isScumMaster = currentParticipant?.isScumMaster || false;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
            <ConfettiCelebration trigger={showConfetti} />
            <KickedNotification isKicked={isKicked} roomCode={code} />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Scrum Poker
                        </h1>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Room Code:
                            </span>
                            <Badge
                                variant="outline"
                                className="text-lg font-mono px-3 py-1"
                            >
                                {code}
                            </Badge>
                            <Button
                                onClick={handleCopyCode}
                                variant="outline"
                                size="sm"
                                className="h-8"
                                title="Copy room code"
                            >
                                {copiedCode ? (
                                    <>
                                        <Check className="w-4 h-4 mr-1" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-1" />
                                        Code
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleCopyLink}
                                variant="outline"
                                size="sm"
                                className="h-8"
                                title="Copy invitation link"
                            >
                                {copiedLink ? (
                                    <>
                                        <Check className="w-4 h-4 mr-1" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-1" />
                                        Link
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    {currentParticipant && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Logged in as:
                                </span>
                                <Badge className="text-base px-3 py-1">
                                    {currentParticipant.name}
                                </Badge>
                                {isScumMaster && (
                                    <Badge variant="secondary">
                                        Scrum Master
                                    </Badge>
                                )}
                            </div>
                            <Button
                                onClick={toggleConfetti}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={
                                    confettiEnabled
                                        ? "Disable confetti"
                                        : "Enable confetti"
                                }
                            >
                                <Settings
                                    className={`w-4 h-4 ${
                                        confettiEnabled
                                            ? "text-green-600"
                                            : "text-gray-400"
                                    }`}
                                />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Debug Component (only shows with ?debug=true) */}
                <PresenceDebug room={room} participantId={participantId} />

                <VotingTimer
                    timerSeconds={room.timerSeconds}
                    timerStartedAt={room.timerStartedAt}
                    votingActive={room.votingActive}
                />

                {/* Current Story */}
                {room.currentStory && (
                    <Card className="border-2 border-blue-500">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Current Story</span>
                                {room.votingActive && (
                                    <Badge className="bg-green-500">
                                        Voting Active
                                    </Badge>
                                )}
                                {room.votesRevealed && (
                                    <Badge className="bg-blue-500">
                                        Votes Revealed
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                {room.currentStory.title}
                            </h2>
                            {room.currentStory.jiraLink && (
                                <a
                                    href={room.currentStory.jiraLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 text-sm"
                                >
                                    View in Jira{" "}
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Voting Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Scrum Master Panel */}
                        {isScumMaster && (
                            <ScrumMasterPanel
                                room={room}
                                onUpdate={mutate}
                                currentUserId={participantId || undefined}
                            />
                        )}

                        {/* Voting Results */}
                        {room.votesRevealed && <VotingResults room={room} />}

                        {/* Fibonacci Cards */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Your Estimate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!room.votingActive && !room.votesRevealed && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                                            Waiting for Scrum Master to start
                                            voting...
                                        </p>
                                    </div>
                                )}

                                {room.votingActive && (
                                    <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                                        {FIBONACCI_VALUES.map((value) => (
                                            <FibonacciCard
                                                key={value}
                                                value={value}
                                                selected={
                                                    selectedVote === value
                                                }
                                                onClick={() =>
                                                    handleVote(value)
                                                }
                                                disabled={!room.votingActive}
                                            />
                                        ))}
                                    </div>
                                )}

                                {room.votesRevealed && (
                                    <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                                        {FIBONACCI_VALUES.map((value) => {
                                            const count =
                                                room.participants.filter(
                                                    (p) => p.vote === value
                                                ).length;
                                            return (
                                                <FibonacciCard
                                                    key={value}
                                                    value={value}
                                                    selected={
                                                        selectedVote === value
                                                    }
                                                    disabled
                                                    revealed
                                                    count={count}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <ParticipantList
                            participants={room.participants}
                            votesRevealed={room.votesRevealed}
                        />

                        {/* Story Queue */}
                        {room.storyQueue.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span>Story Queue</span>
                                        <Badge variant="secondary">
                                            {room.storyQueue.length}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {room.storyQueue.map((story, index) => (
                                            <div
                                                key={story.id}
                                                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="mt-0.5"
                                                    >
                                                        {index + 1}
                                                    </Badge>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                            {story.title}
                                                        </p>
                                                        {story.jiraLink && (
                                                            <a
                                                                href={
                                                                    story.jiraLink
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 mt-1"
                                                            >
                                                                Jira{" "}
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
