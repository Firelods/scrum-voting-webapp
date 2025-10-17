"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { joinRoom } from "@/app/actions/room-actions";
import { Users } from "lucide-react";
import { logger } from "@/lib/logger";

export default function JoinRoomPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = use(params);
    const router = useRouter();
    const [name, setName] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    // Check if user already has a participant ID for this room
    useEffect(() => {
        const storedId = localStorage.getItem(`participant-${code}`);
        if (storedId) {
            // User already joined, redirect directly to the room
            router.push(`/room/${code}`);
        }
    }, [code, router]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsJoining(true);
        try {
            const result = await joinRoom(code.toUpperCase(), name, false);
            if (result.success && result.participantId) {
                // Store participant ID in localStorage
                localStorage.setItem(
                    `participant-${code.toUpperCase()}`,
                    result.participantId
                );
                // Redirect to room
                router.push(`/room/${code.toUpperCase()}`);
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
            <Card className="w-full max-w-md border-2">
                <CardHeader>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-2xl">
                            Join Scrum Poker Room
                        </CardTitle>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Room Code:
                        </span>
                        <Badge
                            variant="outline"
                            className="text-lg font-mono px-3 py-1"
                        >
                            {code}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                                disabled={isJoining}
                                className="text-lg"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isJoining || !name.trim()}
                        >
                            {isJoining ? (
                                <>
                                    <Loader className="w-4 h-4 mr-2" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    <Users className="w-4 h-4 mr-2" />
                                    Join Room
                                </>
                            )}
                        </Button>

                        <div className="text-center">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.push("/")}
                                disabled={isJoining}
                            >
                                Back to Home
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
