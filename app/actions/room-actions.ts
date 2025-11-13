"use server";

import { supabaseServer } from "@/lib/db-supabase";
import type { Room, Story } from "@/lib/types";
import { FIBONACCI_VALUES } from "@/lib/constants";

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
    // Fetch room data first
    const { data: roomData, error: roomError } = await supabaseServer
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();

    if (roomError || !roomData) return null;

    // Parallelize all dependent queries for better performance
    const [participantsResult, votesResult, storiesResult] = await Promise.all([
        supabaseServer
            .from("participants")
            .select("name, is_scrum_master, is_voter")
            .eq("room_code", code)
            .order("joined_at", { ascending: true }),
        supabaseServer
            .from("votes")
            .select("participant_name, vote_value")
            .eq("room_code", code),
        supabaseServer
            .from("stories")
            .select("id, title, jira_link, final_estimate, voted_at")
            .eq("room_code", code)
            .order("order_index", { ascending: true }),
    ]);

    if (participantsResult.error) {
        console.error("Error fetching participants:", participantsResult.error);
        return null;
    }

    if (votesResult.error) {
        console.error("Error fetching votes:", votesResult.error);
        return null;
    }

    if (storiesResult.error) {
        console.error("Error fetching stories:", storiesResult.error);
        return null;
    }

    const participants = participantsResult.data;
    const votes = votesResult.data;
    const stories = storiesResult.data;

    // Create a map of votes by participant name
    const voteMap = new Map(
        (votes || []).map((v: any) => [v.participant_name, v.vote_value])
    );

    const currentStory = (stories || [])[roomData.current_story_index] || null;

    return {
        code: roomData.code,
        currentStory: currentStory
            ? {
                  id: currentStory.id.toString(),
                  title: currentStory.title,
                  jiraLink: currentStory.jira_link || undefined,
                  finalEstimate: currentStory.final_estimate,
                  votedAt: currentStory.voted_at,
              }
            : null,
        storyQueue: (stories || []).map((s: any) => ({
            id: s.id.toString(),
            title: s.title,
            jiraLink: s.jira_link || undefined,
            finalEstimate: s.final_estimate,
            votedAt: s.voted_at,
        })),
        participants: (participants || []).map((p: any) => ({
            id: p.name,
            name: p.name,
            vote: voteMap.get(p.name) || null,
            isScumMaster: p.is_scrum_master,
            isOnline: true, // Always true since we removed heartbeat tracking
            isVoter: p.is_voter !== undefined ? p.is_voter : true,
        })),
        votingActive: roomData.voting_state === "voting",
        votesRevealed: roomData.votes_revealed,
        timerSeconds: roomData.timer_duration,
        timerStartedAt: roomData.timer_end_time
            ? roomData.timer_end_time - roomData.timer_duration * 1000
            : null,
        createdAt: new Date(roomData.created_at).getTime(),
        jiraBaseUrl: roomData.jira_base_url || null,
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
    // First, get the current story and votes
    const { data: roomData } = await supabaseServer
        .from("rooms")
        .select("current_story_index")
        .eq("code", code)
        .single();

    if (!roomData) {
        return { success: false, error: "Room not found" };
    }

    // Get the current story
    const { data: stories } = await supabaseServer
        .from("stories")
        .select("id, title")
        .eq("room_code", code)
        .order("order_index", { ascending: true });

    const currentStory = stories?.[roomData.current_story_index];

    // Get all current votes
    const { data: votes } = await supabaseServer
        .from("votes")
        .select("participant_name, vote_value, created_at")
        .eq("room_code", code);

    // Save votes to history if there's a current story and votes exist
    if (currentStory && votes && votes.length > 0) {
        const historyRecords = votes.map((vote) => ({
            room_code: code,
            story_id: currentStory.id,
            story_title: currentStory.title,
            participant_name: vote.participant_name,
            vote_value: vote.vote_value,
            voted_at: vote.created_at,
            revealed_at: new Date().toISOString(),
        }));

        const { error: historyError } = await supabaseServer
            .from("vote_history")
            .insert(historyRecords);

        if (historyError) {
            console.error("Error saving vote history:", historyError);
            // Continue anyway - don't fail the reveal if history fails
        }

        // Update the story with voted_at timestamp
        await supabaseServer
            .from("stories")
            .update({ voted_at: new Date().toISOString() })
            .eq("id", currentStory.id);
    }

    // Update room state to revealed
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
    // Get current story index and stories
    const { data: roomData, error: roomError } = await supabaseServer
        .from("rooms")
        .select("current_story_index")
        .eq("code", code)
        .single();

    if (roomError || !roomData) {
        return { success: false, error: "Room not found" };
    }

    // Get the current story
    const { data: stories } = await supabaseServer
        .from("stories")
        .select("id, title, final_estimate")
        .eq("room_code", code)
        .order("order_index", { ascending: true });

    const currentStory = stories?.[roomData.current_story_index];

    // If there's a current story without a final estimate, calculate consensus from votes
    if (currentStory && (currentStory.final_estimate === null || currentStory.final_estimate === undefined)) {
        // Note: The votes table only contains votes for the current story.
        // Votes are cleared when starting voting and when moving to the next story.
        // Therefore, filtering by room_code is sufficient.
        const { data: votes } = await supabaseServer
            .from("votes")
            .select("vote_value")
            .eq("room_code", code);

        // If there are votes, calculate the consensus (median rounded to nearest Fibonacci value)
        if (votes && votes.length > 0) {
            const voteValues = votes.map(v => v.vote_value).filter(v => v !== null) as number[];

            if (voteValues.length > 0) {
                // Calculate median
                const sorted = [...voteValues].sort((a, b) => a - b);
                const median = sorted.length % 2 === 0
                    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                    : sorted[Math.floor(sorted.length / 2)];

                // Find closest Fibonacci value to the median
                let consensus = FIBONACCI_VALUES[0];
                let minDiff = Math.abs(median - consensus);

                for (const fibValue of FIBONACCI_VALUES) {
                    const diff = Math.abs(median - fibValue);
                    if (diff < minDiff) {
                        minDiff = diff;
                        consensus = fibValue;
                    }
                }

                // Update story with consensus as final estimate
                await supabaseServer
                    .from("stories")
                    .update({ final_estimate: consensus })
                    .eq("id", currentStory.id);
            }
        }
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

    // Note: Not updating last_activity to avoid triggering unnecessary realtime events
    // The stories table insert will trigger its own realtime event

    const room = await buildRoomObject(code);
    if (!room) {
        return { success: false, error: "Room not found" };
    }

    return { success: true, room };
}

export async function reorderStories(
    code: string,
    storyIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update order_index for each story
        const updatePromises = storyIds.map((storyId, index) =>
            supabaseServer
                .from("stories")
                .update({ order_index: index })
                .eq("id", parseInt(storyId))
                .eq("room_code", code)
        );

        const results = await Promise.all(updatePromises);

        // Check if any update failed
        const failedUpdate = results.find((result) => result.error);
        if (failedUpdate?.error) {
            console.error("Error reordering stories:", failedUpdate.error);
            return { success: false, error: "Failed to reorder stories" };
        }

        // Note: Not updating last_activity to avoid triggering unnecessary realtime events
        // The stories table update will trigger its own realtime event

        return { success: true };
    } catch (error) {
        console.error("Failed to reorder stories:", error);
        return { success: false, error: "Failed to reorder stories" };
    }
}

export async function kickParticipant(
    code: string,
    participantName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if the participant is a scrum master
        const { data: participant, error: fetchError } = await supabaseServer
            .from("participants")
            .select("is_scrum_master")
            .eq("room_code", code)
            .eq("name", participantName)
            .single();

        if (fetchError) {
            console.error("Error fetching participant:", fetchError);
            return { success: false, error: "Participant not found" };
        }

        if (participant?.is_scrum_master) {
            return { success: false, error: "Cannot kick Scrum Master" };
        }

        // Delete participant's votes
        const { error: votesError } = await supabaseServer
            .from("votes")
            .delete()
            .eq("room_code", code)
            .eq("participant_name", participantName);

        if (votesError) {
            console.error("Error deleting votes:", votesError);
        }

        // Delete participant
        const { error: deleteError } = await supabaseServer
            .from("participants")
            .delete()
            .eq("room_code", code)
            .eq("name", participantName);

        if (deleteError) {
            console.error("Error deleting participant:", deleteError);
            return { success: false, error: "Failed to kick participant" };
        }

        // Update last activity
        const { error: updateError } = await supabaseServer
            .from("rooms")
            .update({ last_activity: new Date().toISOString() })
            .eq("code", code);

        if (updateError) {
            console.error("Error updating room activity:", updateError);
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to kick participant:", error);
        return { success: false, error: "Failed to kick participant" };
    }
}

export async function deleteStory(
    code: string,
    storyId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete the story
        const { error: deleteError } = await supabaseServer
            .from("stories")
            .delete()
            .eq("id", parseInt(storyId))
            .eq("room_code", code);

        if (deleteError) {
            console.error("Error deleting story:", deleteError);
            return { success: false, error: "Failed to delete story" };
        }

        // Reorder remaining stories
        const { data: stories, error: fetchError } = await supabaseServer
            .from("stories")
            .select("id")
            .eq("room_code", code)
            .order("order_index", { ascending: true });

        if (fetchError) {
            console.error("Error fetching stories:", fetchError);
            return { success: false, error: "Failed to reorder stories" };
        }

        if (stories && stories.length > 0) {
            const updatePromises = stories.map((story: any, index: number) =>
                supabaseServer
                    .from("stories")
                    .update({ order_index: index })
                    .eq("id", story.id)
            );

            await Promise.all(updatePromises);
        }

        // Note: Not updating last_activity to avoid triggering unnecessary realtime events
        // The stories table updates will trigger their own realtime events

        return { success: true };
    } catch (error) {
        console.error("Failed to delete story:", error);
        return { success: false, error: "Failed to delete story" };
    }
}

export async function setFinalEstimate(
    code: string,
    storyId: string,
    estimate: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseServer
            .from("stories")
            .update({ final_estimate: estimate })
            .eq("id", parseInt(storyId))
            .eq("room_code", code);

        if (error) {
            console.error("Error setting final estimate:", error);
            return { success: false, error: "Failed to set final estimate" };
        }

        // Update room activity
        await supabaseServer
            .from("rooms")
            .update({ last_activity: new Date().toISOString() })
            .eq("code", code);

        return { success: true };
    } catch (error) {
        console.error("Failed to set final estimate:", error);
        return { success: false, error: "Failed to set final estimate" };
    }
}

interface VoteHistoryEntry {
    story_id: number;
    story_title: string;
    final_estimate: number | null;
    voted_at: string | null;
    votes: Array<{
        participant_name: string;
        vote_value: number;
    }>;
    statistics: {
        average: number;
        median: number;
        mode: number;
        min: number;
        max: number;
    };
}

export async function updateStory(
    code: string,
    storyId: string,
    title: string,
    jiraLink?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseServer
            .from("stories")
            .update({
                title,
                jira_link: jiraLink || null
            })
            .eq("id", parseInt(storyId))
            .eq("room_code", code);

        if (error) {
            console.error("Error updating story:", error);
            return { success: false, error: "Failed to update story" };
        }

        // Note: Not updating last_activity to avoid triggering unnecessary realtime events
        // The stories table update will trigger its own realtime event

        return { success: true };
    } catch (error) {
        console.error("Failed to update story:", error);
        return { success: false, error: "Failed to update story" };
    }
}

export async function addMultipleStoriesToQueue(
    code: string,
    stories: { title: string; jiraLink?: string }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: maxOrderData } = await supabaseServer
            .from("stories")
            .select("order_index")
            .eq("room_code", code)
            .order("order_index", { ascending: false })
            .limit(1)
            .single();

        const maxOrder = maxOrderData?.order_index ?? -1;

        const storiesToInsert = stories.map((story, index) => ({
            room_code: code,
            title: story.title,
            jira_link: story.jiraLink || null,
            order_index: maxOrder + 1 + index,
        }));

        const { error: insertError } = await supabaseServer
            .from("stories")
            .insert(storiesToInsert);

        if (insertError) {
            console.error("Error inserting stories:", insertError);
            return { success: false, error: "Failed to add stories" };
        }

        // Note: Not updating last_activity to avoid triggering unnecessary realtime events
        // The stories table inserts will trigger their own realtime events

        return { success: true };
    } catch (error) {
        console.error("Failed to add multiple stories:", error);
        return { success: false, error: "Failed to add stories" };
    }
}

export async function updateJiraBaseUrl(
    code: string,
    jiraBaseUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseServer
            .from("rooms")
            .update({
                jira_base_url: jiraBaseUrl || null,
                last_activity: new Date().toISOString()
            })
            .eq("code", code);

        if (error) {
            console.error("Error updating Jira base URL:", error);
            return { success: false, error: "Failed to update Jira base URL" };
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to update Jira base URL:", error);
        return { success: false, error: "Failed to update Jira base URL" };
    }
}

export async function updateParticipantVoterStatus(
    code: string,
    participantName: string,
    isVoter: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseServer
            .from("participants")
            .update({ is_voter: isVoter })
            .eq("room_code", code)
            .eq("name", participantName);

        if (error) {
            console.error("Error updating voter status:", error);
            return { success: false, error: "Failed to update voter status" };
        }

        await supabaseServer
            .from("rooms")
            .update({ last_activity: new Date().toISOString() })
            .eq("code", code);

        return { success: true };
    } catch (error) {
        console.error("Failed to update voter status:", error);
        return { success: false, error: "Failed to update voter status" };
    }
}

export async function promoteToScrumMaster(
    code: string,
    participantName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseServer
            .from("participants")
            .update({ is_scrum_master: true })
            .eq("room_code", code)
            .eq("name", participantName);

        if (error) {
            console.error("Error promoting to scrum master:", error);
            return { success: false, error: "Failed to promote participant" };
        }

        await supabaseServer
            .from("rooms")
            .update({ last_activity: new Date().toISOString() })
            .eq("code", code);

        return { success: true };
    } catch (error) {
        console.error("Failed to promote to scrum master:", error);
        return { success: false, error: "Failed to promote participant" };
    }
}

export async function getVoteHistory(
    code: string
): Promise<{ success: boolean; history?: VoteHistoryEntry[]; error?: string }> {
    try {
        // Get all stories that have been voted on
        const { data: stories, error: storiesError } = await supabaseServer
            .from("stories")
            .select("id, title, final_estimate, voted_at")
            .eq("room_code", code)
            .not("voted_at", "is", null)
            .order("voted_at", { ascending: false });

        if (storiesError) {
            console.error("Error fetching stories:", storiesError);
            return { success: false, error: "Failed to fetch vote history" };
        }

        if (!stories || stories.length === 0) {
            return { success: true, history: [] };
        }

        // Get vote history for each story
        const history: VoteHistoryEntry[] = [];

        for (const story of stories) {
            const { data: votes, error: votesError } = await supabaseServer
                .from("vote_history")
                .select("participant_name, vote_value")
                .eq("story_id", story.id)
                .order("participant_name", { ascending: true });

            if (votesError || !votes || votes.length === 0) {
                continue;
            }

            // Calculate statistics
            const voteValues = votes.map((v) => v.vote_value);
            const sum = voteValues.reduce((a, b) => a + b, 0);
            const average = sum / voteValues.length;

            const sorted = [...voteValues].sort((a, b) => a - b);
            const median =
                sorted.length % 2 === 0
                    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                    : sorted[Math.floor(sorted.length / 2)];

            // Find mode (most common value)
            const frequency: { [key: number]: number } = {};
            let maxFreq = 0;
            let mode = voteValues[0];
            for (const val of voteValues) {
                frequency[val] = (frequency[val] || 0) + 1;
                if (frequency[val] > maxFreq) {
                    maxFreq = frequency[val];
                    mode = val;
                }
            }

            const min = Math.min(...voteValues);
            const max = Math.max(...voteValues);

            history.push({
                story_id: story.id,
                story_title: story.title,
                final_estimate: story.final_estimate,
                voted_at: story.voted_at,
                votes: votes.map((v) => ({
                    participant_name: v.participant_name,
                    vote_value: v.vote_value,
                })),
                statistics: {
                    average,
                    median,
                    mode,
                    min,
                    max,
                },
            });
        }

        return { success: true, history };
    } catch (error) {
        console.error("Failed to get vote history:", error);
        return { success: false, error: "Failed to get vote history" };
    }
}
