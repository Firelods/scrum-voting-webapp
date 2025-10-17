"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";

interface KickedNotificationProps {
    isKicked: boolean;
    roomCode: string;
}

export function KickedNotification({
    isKicked,
    roomCode,
}: KickedNotificationProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (isKicked) {
            setOpen(true);
            // Remove participant ID from localStorage
            localStorage.removeItem(`participant-${roomCode}`);
        }
    }, [isKicked, roomCode]);

    const handleRejoin = () => {
        setOpen(false);
        router.push(`/room/${roomCode}/join`);
    };

    const handleGoHome = () => {
        setOpen(false);
        router.push("/");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle className="text-xl">
                            You've been removed
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        The Scrum Master has removed you from this room. You can
                        rejoin with a different name if needed, or return to the
                        home page.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={handleGoHome}
                        className="w-full sm:w-auto"
                    >
                        Go Home
                    </Button>
                    <Button
                        onClick={handleRejoin}
                        className="w-full sm:w-auto"
                    >
                        Rejoin Room
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
