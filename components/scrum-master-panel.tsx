"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    revealVotes,
    startVoting,
    nextStory,
    addStoryToQueue,
} from "@/app/actions/room-actions";
import type { Room } from "@/lib/types";
import { logger } from "@/lib/logger";
import {
    Play,
    Eye,
    SkipForward,
    Plus,
    RotateCcw,
    Users,
    List,
} from "lucide-react";
import { ParticipantsManager } from "./participants-manager";
import { StoryQueueManager } from "./story-queue-manager";
import { PublishToJira } from "./publish-to-jira";

interface ScrumMasterPanelProps {
    room: Room;
    onUpdate: () => void;
    currentUserId?: string;
}

export function ScrumMasterPanel({
    room,
    onUpdate,
    currentUserId,
}: ScrumMasterPanelProps) {
    const [isAddingStory, setIsAddingStory] = useState(false);
    const [storyTitle, setStoryTitle] = useState("");
    const [jiraLink, setJiraLink] = useState("");
    const [timerMinutes, setTimerMinutes] = useState<number>(2);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showStoryQueue, setShowStoryQueue] = useState(false);
    const [isStartingVote, setIsStartingVote] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [isMovingNext, setIsMovingNext] = useState(false);
    const [isAddingToQueue, setIsAddingToQueue] = useState(false);

    const handleStartVoting = async () => {
        setIsStartingVote(true);
        try {
            const timerSeconds =
                timerMinutes > 0 ? timerMinutes * 60 : undefined;
            // Ne pas passer currentStory car elle est déjà dans la queue
            await startVoting(room.code, undefined, timerSeconds);
            await onUpdate();
        } catch (error) {
            logger.error("Failed to start voting:", error);
        } finally {
            setIsStartingVote(false);
        }
    };

    const handleRevealVotes = async () => {
        setIsRevealing(true);
        try {
            await revealVotes(room.code);
            await onUpdate();
        } catch (error) {
            logger.error("Failed to reveal votes:", error);
        } finally {
            setIsRevealing(false);
        }
    };

    const handleNextStory = async () => {
        setIsMovingNext(true);
        try {
            await nextStory(room.code);
            await onUpdate();
        } catch (error) {
            logger.error("Failed to move to next story:", error);
        } finally {
            setIsMovingNext(false);
        }
    };

    const handleAddStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storyTitle.trim()) return;

        setIsAddingToQueue(true);
        try {
            const story = {
                id: `story-${Date.now()}`,
                title: storyTitle,
                jiraLink: jiraLink || undefined,
            };
            await addStoryToQueue(room.code, story);
            setStoryTitle("");
            setJiraLink("");
            setIsAddingStory(false);
            await onUpdate();
        } catch (error) {
            logger.error("Failed to add story:", error);
        } finally {
            setIsAddingToQueue(false);
        }
    };

    // Only count online participants for voting
    const onlineParticipants = room.participants.filter((p) => p.isOnline);
    const votedCount = onlineParticipants.filter((p) => p.vote !== null).length;
    const totalCount = onlineParticipants.length;

    // Calculate suggested points (mode - most common vote)
    const calculateSuggestedPoints = (): number | undefined => {
        const votes = onlineParticipants
            .map((p) => p.vote)
            .filter((v) => v !== null) as number[];
        
        if (votes.length === 0) return undefined;

        const voteCounts = new Map<number, number>();
        votes.forEach((vote) => {
            voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
        });

        const mode = Array.from(voteCounts.entries()).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];

        return mode;
    };

    const suggestedPoints = room.votesRevealed ? calculateSuggestedPoints() : undefined;

    return (
        <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Scrum Master Controls</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Voting Status */}
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Voting Progress
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {votedCount} / {totalCount}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 dark:bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${
                                    totalCount > 0
                                        ? (votedCount / totalCount) * 100
                                        : 0
                                }%`,
                            }}
                        />
                    </div>
                </div>

                {/* Timer Setting */}
                {!room.votingActive && !room.votesRevealed && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <Label
                            htmlFor="timer"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Timer (minutes, 0 = no timer)
                        </Label>
                        <Input
                            id="timer"
                            type="number"
                            min="0"
                            max="10"
                            value={timerMinutes}
                            onChange={(e) =>
                                setTimerMinutes(Number(e.target.value))
                            }
                            className="mt-1"
                        />
                    </div>
                )}

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {!room.votingActive && !room.votesRevealed && (
                        <>
                            <Button
                                onClick={handleStartVoting}
                                className="w-full"
                                size="lg"
                                disabled={!room.currentStory || isStartingVote}
                            >
                                {isStartingVote ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Voting
                                    </>
                                )}
                            </Button>
                            <Dialog
                                open={isAddingStory}
                                onOpenChange={setIsAddingStory}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-transparent"
                                        size="lg"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Story
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Add Story to Queue
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form
                                        onSubmit={handleAddStory}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label htmlFor="storyTitle">
                                                Story Title
                                            </Label>
                                            <Input
                                                id="storyTitle"
                                                placeholder="Enter story title"
                                                value={storyTitle}
                                                onChange={(e) =>
                                                    setStoryTitle(
                                                        e.target.value
                                                    )
                                                }
                                                className="mt-1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="jiraLink">
                                                Jira Link (optional)
                                            </Label>
                                            <Input
                                                id="jiraLink"
                                                type="url"
                                                placeholder="https://..."
                                                value={jiraLink}
                                                onChange={(e) =>
                                                    setJiraLink(e.target.value)
                                                }
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                className="flex-1"
                                                disabled={isAddingToQueue}
                                            >
                                                {isAddingToQueue ? (
                                                    <>
                                                        <Loader size="sm" className="mr-2" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    "Add to Queue"
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setIsAddingStory(false)
                                                }
                                                disabled={isAddingToQueue}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}

                    {room.votingActive && (
                        <Button
                            onClick={handleRevealVotes}
                            className="w-full col-span-2"
                            size="lg"
                            variant="default"
                            disabled={isRevealing}
                        >
                            {isRevealing ? (
                                <>
                                    <Loader size="sm" className="mr-2" />
                                    Revealing...
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Reveal Votes
                                </>
                            )}
                        </Button>
                    )}

                    {room.votesRevealed && (
                        <>
                            <Button
                                onClick={handleNextStory}
                                className="w-full"
                                size="lg"
                                disabled={isMovingNext}
                            >
                                {isMovingNext ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <SkipForward className="w-4 h-4 mr-2" />
                                        Next Story
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleStartVoting}
                                variant="outline"
                                className="w-full bg-transparent"
                                size="lg"
                                disabled={isStartingVote}
                            >
                                {isStartingVote ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Re-vote
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>

                {/* Jira Integration - Show when votes are revealed */}
                {room.votesRevealed && room.currentStory && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <PublishToJira
                            jiraLink={room.currentStory.jiraLink}
                            suggestedPoints={suggestedPoints}
                        />
                    </div>
                )}

                {/* Quick Actions */}
                {!room.currentStory && room.storyQueue.length === 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Get started by adding your first story to the queue.
                        </p>
                        <Button
                            onClick={() => setIsAddingStory(true)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Story
                        </Button>
                    </div>
                )}

                {!room.currentStory && room.storyQueue.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Ready to start! Click "Start Voting" to begin with
                            the first story in the queue.
                        </p>
                    </div>
                )}

                {/* Advanced Management Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Dialog
                        open={showParticipants}
                        onOpenChange={setShowParticipants}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Manage Participants
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Manage Participants</DialogTitle>
                            </DialogHeader>
                            <ParticipantsManager
                                roomCode={room.code}
                                participants={room.participants}
                                currentUserId={currentUserId}
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={showStoryQueue}
                        onOpenChange={setShowStoryQueue}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <List className="w-4 h-4 mr-2" />
                                Manage Queue
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Manage Story Queue</DialogTitle>
                            </DialogHeader>
                            <StoryQueueManager
                                roomCode={room.code}
                                stories={room.storyQueue}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
