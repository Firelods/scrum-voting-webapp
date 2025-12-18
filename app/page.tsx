"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { createRoom, joinRoom } from "./actions/room-actions";
import { Users, Plus, LogIn } from "lucide-react";
import { logger } from "@/lib/logger";

export default function HomePage() {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Join room state
    const [roomCode, setRoomCode] = useState("");
    const [joinName, setJoinName] = useState("");

    const handleCreateRoom = async () => {
        setIsCreating(true);
        try {
            const result = await createRoom();
            if (result.success && result.room) {
                // Redirect to room setup page
                router.push(`/room/${result.room.code}/setup`);
            } else {
                alert(result.error || "Failed to create room");
            }
        } catch (error) {
            logger.error("Failed to create room:", error);
            alert("Failed to create room. Please try again later.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomCode.trim() || !joinName.trim()) return;

        setIsJoining(true);
        try {
            const result = await joinRoom(
                roomCode.toUpperCase(),
                joinName,
                false
            );
            if (result.success && result.participantId) {
                // Store participant ID in localStorage
                localStorage.setItem(
                    `participant-${roomCode.toUpperCase()}`,
                    result.participantId
                );
                // Redirect to room
                router.push(`/room/${roomCode.toUpperCase()}`);
            } else {
                alert(result.error || "Failed to join room");
            }
        } catch (error) {
            logger.error("Failed to join room:", error);
            alert("Failed to join room");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Users className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
                            Scrum Poker
                        </h1>
                    </div>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Collaborative story point estimation for agile teams
                    </p>
                </div>

                {/* Main Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Create Room Card */}
                    <Card className="border-2 hover:border-blue-500 transition-colors">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <CardTitle className="text-2xl">
                                    Create Room
                                </CardTitle>
                            </div>
                            <CardDescription className="text-base">
                                Start a new voting session as Scrum Master
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleCreateRoom}
                                disabled={isCreating}
                                className="w-full h-12 text-lg"
                                size="lg"
                            >
                                {isCreating ? (
                                    <span className="flex items-center gap-2">
                                        <Loader
                                            size="sm"
                                            className="text-white"
                                        />
                                        Creating...
                                    </span>
                                ) : (
                                    "Create New Room"
                                )}
                            </Button>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    As Scrum Master, you'll control the voting
                                    flow, reveal results, and manage the story
                                    queue.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Join Room Card */}
                    <Card className="border-2 hover:border-green-500 transition-colors">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <LogIn className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <CardTitle className="text-2xl">
                                    Join Room
                                </CardTitle>
                            </div>
                            <CardDescription className="text-base">
                                Enter an existing room to participate in voting
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleJoinRoom}
                                className="space-y-4"
                            >
                                <div>
                                    <Label
                                        htmlFor="roomCode"
                                        className="text-base"
                                    >
                                        Room Code
                                    </Label>
                                    <Input
                                        id="roomCode"
                                        placeholder="Enter 6-character code"
                                        value={roomCode}
                                        onChange={(e) =>
                                            setRoomCode(
                                                e.target.value.toUpperCase()
                                            )
                                        }
                                        maxLength={6}
                                        className="mt-1 h-12 text-lg uppercase"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="joinName"
                                        className="text-base"
                                    >
                                        Your Name
                                    </Label>
                                    <Input
                                        id="joinName"
                                        placeholder="Enter your name"
                                        value={joinName}
                                        onChange={(e) =>
                                            setJoinName(e.target.value)
                                        }
                                        className="mt-1 h-12 text-lg"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isJoining}
                                    className="w-full h-12 text-lg"
                                    size="lg"
                                >
                                    {isJoining ? (
                                        <span className="flex items-center gap-2">
                                            <Loader
                                                size="sm"
                                                className="text-white"
                                            />
                                            Joining...
                                        </span>
                                    ) : (
                                        "Join Room"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
