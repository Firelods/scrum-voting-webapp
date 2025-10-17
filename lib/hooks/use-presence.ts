"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * Hook to track user presence in a room using Supabase Realtime Presence
 * This allows us to know which participants are currently active/online
 */
export function usePresence(
    roomCode: string | null,
    participantId: string | null
) {
    useEffect(() => {
        if (!roomCode || !participantId) return;

        const channel = supabase.channel(`presence:${roomCode}`, {
            config: {
                presence: {
                    key: participantId,
                },
            },
        });

        // Track this user's presence
        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                logger.log("👤 Presence sync:", state);
            })
            .on("presence", { event: "join" }, ({ key, newPresences }) => {
                logger.log("✅ User joined:", key, newPresences);
            })
            .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
                logger.log("❌ User left:", key, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    // Track this user as present
                    await channel.track({
                        participantId,
                        onlineAt: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, [roomCode, participantId]);
}

/**
 * Hook to get the list of online participants
 */
export function useOnlineParticipants(roomCode: string | null) {
    const [onlineParticipants, setOnlineParticipants] = useState<Set<string>>(
        new Set()
    );

    useEffect(() => {
        if (!roomCode) return;

        const channel = supabase.channel(`presence:${roomCode}`);

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const online = new Set<string>();

                Object.keys(state).forEach((key) => {
                    online.add(key);
                });

                setOnlineParticipants(online);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomCode]);

    return onlineParticipants;
}
