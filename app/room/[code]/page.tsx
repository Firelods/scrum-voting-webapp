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
import { Copy, Check, ExternalLink, Settings, TrendingUp, Filter } from "lucide-react";
import { ScrumMasterPanel } from "@/components/scrum-master-panel";
import { VotingResults } from "@/components/voting-results";
import { VotingTimer } from "@/components/voting-timer";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { PresenceDebug } from "@/components/presence-debug";
import { KickedNotification } from "@/components/kicked-notification";
import { VoteSummary } from "@/components/vote-summary";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { FIBONACCI_VALUES } from "@/lib/constants";

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
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [showVoteSummary, setShowVoteSummary] = useState(false);
    const [showOnlyUnestimated, setShowOnlyUnestimated] = useState(false);

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
        if (!participantId || !room?.votingActive || isSubmittingVote) return;

        setSelectedVote(value);
        setIsSubmittingVote(true);
        try {
            await submitVote(code, participantId, value);
            // WebSocket will automatically trigger an update, no need to call mutate()
        } catch (error) {
            logger.error("Failed to submit vote:", error);
        } finally {
            setIsSubmittingVote(false);
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
                                            className="text-blue-600 dark:text-blue-400"
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
    const isVoter = currentParticipant?.isVoter ?? true; // Default to true for backward compatibility

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
                                className="text-lg font-mono px-3 py-1 dark:text-white"
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
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-gray-400 dark:text-gray-500"
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
                                    <Badge className="bg-green-500 dark:bg-green-600 text-white">
                                        Voting Active
                                    </Badge>
                                )}
                                {room.votesRevealed && (
                                    <Badge className="bg-blue-500 dark:bg-blue-600 text-white">
                                        Votes Revealed
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                {room.currentStory.title}
                            </h2>
                            {room.currentStory.jiraLink && (
                                <a
                                    href={room.currentStory.jiraLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm"
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
                                {!isVoter ? (
                                    <div className="text-center py-12">
                                        <Badge variant="secondary" className="mb-4 text-base px-4 py-2">
                                            Observer Mode
                                        </Badge>
                                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                                            You are participating as an observer.
                                        </p>
                                        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                                            You can follow the voting but cannot submit your own vote.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {!room.votingActive && !room.votesRevealed && (
                                            <div className="text-center py-12">
                                                <p className="text-gray-600 dark:text-gray-400 text-lg">
                                                    Waiting for Scrum Master to start
                                                    voting...
                                                </p>
                                            </div>
                                        )}

                                        {room.votingActive && (
                                            <div className="relative flex flex-wrap justify-center gap-3 md:gap-4">
                                                {isSubmittingVote && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-lg z-10">
                                                        <Loader size="md" className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                )}
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
                                                        disabled={!room.votingActive || isSubmittingVote}
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
                                    </>
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

                        {/* Vote Summary Button */}
                        <Dialog
                            open={showVoteSummary}
                            onOpenChange={setShowVoteSummary}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                >
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    View Vote Summary
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Vote Summary & History</DialogTitle>
                                </DialogHeader>
                                <VoteSummary roomCode={code} />
                            </DialogContent>
                        </Dialog>

                        {/* Story Queue */}
                        {room.storyQueue.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span>Story Queue</span>
                                            <Badge variant="secondary">
                                                {showOnlyUnestimated
                                                    ? room.storyQueue.filter(s => s.finalEstimate === null || s.finalEstimate === undefined).length
                                                    : room.storyQueue.length}
                                            </Badge>
                                        </CardTitle>
                                        <Button
                                            variant={showOnlyUnestimated ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setShowOnlyUnestimated(!showOnlyUnestimated)}
                                        >
                                            <Filter className="w-3 h-3 mr-1" />
                                            {showOnlyUnestimated ? "All" : "Unest."}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {room.storyQueue
                                            .filter(story => !showOnlyUnestimated || story.finalEstimate === null || story.finalEstimate === undefined)
                                            .map((story) => {
                                            const isCurrent = story.id === room.currentStory?.id;
                                            const actualIndex = room.storyQueue.findIndex(s => s.id === story.id);
                                            return (
                                                <div
                                                    key={story.id}
                                                    className={`p-3 rounded-lg border ${
                                                        isCurrent
                                                            ? "bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-500"
                                                            : "bg-gray-50 dark:bg-gray-800 border-transparent"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className="mt-0.5 flex-shrink-0"
                                                        >
                                                            {actualIndex + 1}
                                                        </Badge>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {isCurrent && (
                                                                    <Badge className="bg-blue-600 dark:bg-blue-600 text-xs flex-shrink-0">
                                                                        Current
                                                                    </Badge>
                                                                )}
                                                                {story.finalEstimate !== null &&
                                                                 story.finalEstimate !== undefined && (
                                                                    <Badge variant="secondary" className="font-bold text-xs flex-shrink-0">
                                                                        {story.finalEstimate} pts
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="font-medium text-sm text-gray-900 dark:text-white break-words line-clamp-2" title={story.title}>
                                                                {story.title}
                                                            </p>
                                                            {story.jiraLink && (
                                                                <a
                                                                    href={
                                                                        story.jiraLink
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-1"
                                                                >
                                                                    Jira{" "}
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
