"use server";

import { supabaseServer } from "@/lib/db-supabase";
import type { Room, Story } from "@/lib/types";

// Helper function to generate a random room code
function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Helper function to build Room object from database rows
async function buildRoomObject(code: string): Promise<Room | null> {
    // Fetch room data
    const { data: roomData, error: roomError } = await supabaseServer
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();

    if (roomError || !roomData) return null;

    // Fetch participants
    const { data: participants, error: participantsError } =
        await supabaseServer
            .from("participants")
            .select("name, is_scrum_master, last_seen")
            .eq("room_code", code)
            .order("joined_at", { ascending: true });

    if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        return null;
    }

    // Determine who is online (last seen within 15 seconds)
    const now = Date.now();
    const onlineThreshold = 15000; // 15 seconds

    // Fetch votes separately
    const { data: votes, error: votesError } = await supabaseServer
        .from("votes")
        .select("participant_name, vote_value")
        .eq("room_code", code);

    if (votesError) {
        console.error("Error fetching votes:", votesError);
        return null;
    }

    // Create a map of votes by participant name
    const voteMap = new Map(
        (votes || []).map((v: any) => [v.participant_name, v.vote_value])
    );

    // Fetch stories
    const { data: stories, error: storiesError } = await supabaseServer
        .from("stories")
        .select("id, title, jira_link")
        .eq("room_code", code)
        .order("order_index", { ascending: true });

    if (storiesError) {
        console.error("Error fetching stories:", storiesError);
        return null;
    }

    const currentStory = (stories || [])[roomData.current_story_index] || null;

    return {
        code: roomData.code,
        currentStory: currentStory
            ? {
                  id: currentStory.id.toString(),
                  title: currentStory.title,
                  jiraLink: currentStory.jira_link || undefined,
              }
            : null,
        storyQueue: (stories || []).map((s: any) => ({
            id: s.id.toString(),
            title: s.title,
            jiraLink: s.jira_link || undefined,
        })),
        participants: (participants || []).map((p: any) => {
            const lastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0;
            const isOnline = now - lastSeen < onlineThreshold;

            return {
                id: p.name,
                name: p.name,
                vote: voteMap.get(p.name) || null,
                isScumMaster: p.is_scrum_master,
                isOnline,
                lastSeen,
            };
        }),
        votingActive: roomData.voting_state === "voting",
        votesRevealed: roomData.votes_revealed,
        timerSeconds: roomData.timer_duration,
        timerStartedAt: roomData.timer_end_time
            ? roomData.timer_end_time - roomData.timer_duration * 1000
            : null,
        createdAt: new Date(roomData.created_at).getTime(),
    };
}

export async function createRoom() {
    const code = generateRoomCode();

    const { error } = await supabaseServer.from("rooms").insert({
        code,
        scrum_master_name: "Scrum Master",
    });

    if (error) {
        console.error("Error creating room:", error);
        return { success: false, error: "Failed to create room" };
    }

    const room = await buildRoomObject(code);
    return { success: true, room };
}

export async function joinRoom(
    code: string,
    name: string,
    isScumMaster = false
) {
    // Check if room exists
    const { data: room, error: roomError } = await supabaseServer
        .from("rooms")
        .select("code")
        .eq("code", code)
        .single();

    if (roomError || !room) {
        return { success: false, error: "Room not found" };
    }

    // Update last activity
    const { error: updateError } = await supabaseServer
        .from("rooms")
        .update({ last_activity: new Date().toISOString() })
        .eq("code", code);

    if (updateError) {
        console.error("Error updating room activity:", updateError);
    }

    // Add participant (or update if exists)
    const { error: participantError } = await supabaseServer
        .from("participants")
        .upsert(
            {
                room_code: code,
                name,
                is_scrum_master: isScumMaster,
            },
            {
                onConflict: "room_code,name",
            }
        );

    if (participantError) {
        console.error("Error adding participant:", participantError);
        return { success: false, error: "Failed to join room" };
    }

    const roomData = await buildRoomObject(code);
    return { success: true, room: roomData, participantId: name };
}

export async function getRoomState(code: string) {
    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    // Don't update last_activity here - it causes infinite loops with Realtime
    // Only update last_activity on real actions (vote, start voting, etc.)

    return { success: true, room };
}

export async function submitVote(
    code: string,
    participantId: string,
    vote: number | null
) {
    // Update last activity
    const { error: updateError } = await supabaseServer
        .from("rooms")
        .update({ last_activity: new Date().toISOString() })
        .eq("code", code);

    if (updateError) {
        console.error("Error updating room activity:", updateError);
    }

    if (vote === null) {
        // Remove vote
        const { error: deleteError } = await supabaseServer
            .from("votes")
            .delete()
            .eq("room_code", code)
            .eq("participant_name", participantId);

        if (deleteError) {
            console.error("Error deleting vote:", deleteError);
        }
    } else {
        // Insert or update vote
        const { error: voteError } = await supabaseServer.from("votes").upsert(
            {
                room_code: code,
                participant_name: participantId,
                vote_value: vote,
                created_at: new Date().toISOString(),
            },
            {
                onConflict: "room_code,participant_name",
            }
        );

        if (voteError) {
            console.error("Error submitting vote:", voteError);
            return { success: false, error: "Failed to submit vote" };
        }
    }

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}

export async function revealVotes(code: string) {
    const { error } = await supabaseServer
        .from("rooms")
        .update({
            voting_state: "revealed",
            votes_revealed: true,
            last_activity: new Date().toISOString(),
        })
        .eq("code", code);

    if (error) {
        console.error("Error revealing votes:", error);
        return { success: false, error: "Failed to reveal votes" };
    }

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}

export async function startVoting(
    code: string,
    story?: Story,
    timerSeconds?: number
) {
    // If a new story is provided, add it to the queue
    // This is only used when starting voting with a completely new story
    if (story) {
        const { data: maxOrderData } = await supabaseServer
            .from("stories")
            .select("order_index")
            .eq("room_code", code)
            .order("order_index", { ascending: false })
            .limit(1)
            .single();

        const maxOrder = maxOrderData?.order_index ?? -1;

        const { error: insertError } = await supabaseServer
            .from("stories")
            .insert({
                room_code: code,
                title: story.title,
                jira_link: story.jiraLink || null,
                order_index: maxOrder + 1,
            });

        if (insertError) {
            console.error("Error inserting story:", insertError);
            return { success: false, error: "Failed to add story" };
        }
    }

    // Clear all votes
    const { error: deleteError } = await supabaseServer
        .from("votes")
        .delete()
        .eq("room_code", code);

    if (deleteError) {
        console.error("Error deleting votes:", deleteError);
    }

    // Update room state
    const timerEndTime = timerSeconds ? Date.now() + timerSeconds * 1000 : null;

    const { error: updateError } = await supabaseServer
        .from("rooms")
        .update({
            voting_state: "voting",
            votes_revealed: false,
            timer_duration: timerSeconds || null,
            timer_end_time: timerEndTime,
            last_activity: new Date().toISOString(),
        })
        .eq("code", code);

    if (updateError) {
        console.error("Error updating room state:", updateError);
        return { success: false, error: "Failed to start voting" };
    }

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}

export async function nextStory(code: string) {
    // Get current story index
    const { data: roomData, error: roomError } = await supabaseServer
        .from("rooms")
        .select("current_story_index")
        .eq("code", code)
        .single();

    if (roomError || !roomData) {
        return { success: false, error: "Room not found" };
    }

    // Clear votes and move to next story
    const { error: deleteError } = await supabaseServer
        .from("votes")
        .delete()
        .eq("room_code", code);

    if (deleteError) {
        console.error("Error deleting votes:", deleteError);
    }

    const { error: updateError } = await supabaseServer
        .from("rooms")
        .update({
            current_story_index: roomData.current_story_index + 1,
            voting_state: "idle",
            votes_revealed: false,
            timer_duration: null,
            timer_end_time: null,
            last_activity: new Date().toISOString(),
        })
        .eq("code", code);

    if (updateError) {
        console.error("Error updating room:", updateError);
        return { success: false, error: "Failed to move to next story" };
    }

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}

export async function addStoryToQueue(code: string, story: Story) {
    const { data: maxOrderData } = await supabaseServer
        .from("stories")
        .select("order_index")
        .eq("room_code", code)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const maxOrder = maxOrderData?.order_index ?? -1;

    const { error: insertError } = await supabaseServer.from("stories").insert({
        room_code: code,
        title: story.title,
        jira_link: story.jiraLink || null,
        order_index: maxOrder + 1,
    });

    if (insertError) {
        console.error("Error inserting story:", insertError);
        return { success: false, error: "Failed to add story" };
    }

    const { error: updateError } = await supabaseServer
        .from("rooms")
        .update({ last_activity: new Date().toISOString() })
        .eq("code", code);

    if (updateError) {
        console.error("Error updating room activity:", updateError);
    }

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}
