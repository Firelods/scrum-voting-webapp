"use client";

import type React from "react";

import { use, useState } from "react";
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
import { joinRoom } from "@/app/actions/room-actions";
import { Copy, Check } from "lucide-react";

export default function RoomSetupPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = use(params);
    const router = useRouter();
    const [name, setName] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    const roomUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/room/${code}/join`
            : "";

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(roomUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsJoining(true);
        try {
            const result = await joinRoom(code, name, true); // true = Scrum Master
            if (result.success && result.participantId) {
                localStorage.setItem(
                    `participant-${code}`,
                    result.participantId
                );
                router.push(`/room/${code}`);
            } else {
                alert(result.error || "Failed to join room");
            }
        } catch (error) {
            console.error("Failed to join room:", error);
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl">
                        Room Created Successfully!
                    </CardTitle>
                    <CardDescription className="text-base">
                        Share the room code with your team to get started
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Room Code Display */}
                    <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                            Room Code
                        </Label>
                        <div className="flex items-center gap-3">
                            <div className="text-4xl font-bold tracking-wider text-blue-600 dark:text-blue-400 flex-1">
                                {code}
                            </div>
                            <Button
                                onClick={handleCopyCode}
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 bg-transparent"
                            >
                                {copiedCode ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Room URL */}
                    <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                            Or share this link
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={roomUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                onClick={handleCopyUrl}
                                variant="outline"
                                size="icon"
                            >
                                {copiedUrl ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Scrum Master Name */}
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-base">
                                Your Name (Scrum Master)
                            </Label>
                            <Input
                                id="name"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                                    <Loader size="sm" className="text-white" />
                                    Joining...
                                </span>
                            ) : (
                                "Enter Room as Scrum Master"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
