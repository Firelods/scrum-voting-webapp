"use server"

import { sql } from "@/lib/db"
import type { Room, Story } from "@/lib/types"

// Helper function to generate a random room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Helper function to build Room object from database rows
async function buildRoomObject(code: string): Promise<Room | null> {
  const [roomData] = await sql`
    SELECT * FROM rooms WHERE code = ${code}
  `

  if (!roomData) return null

  const participants = await sql`
    SELECT p.name, p.is_scrum_master, v.vote_value
    FROM participants p
    LEFT JOIN votes v ON p.room_code = v.room_code AND p.name = v.participant_name
    WHERE p.room_code = ${code}
    ORDER BY p.joined_at
  `

  const stories = await sql`
    SELECT id, title, jira_link
    FROM stories
    WHERE room_code = ${code}
    ORDER BY order_index
  `

  const currentStory = stories[roomData.current_story_index] || null

  return {
    code: roomData.code,
    currentStory: currentStory
      ? {
          id: currentStory.id.toString(),
          title: currentStory.title,
          jiraLink: currentStory.jira_link || undefined,
        }
      : null,
    storyQueue: stories.map((s: any) => ({
      id: s.id.toString(),
      title: s.title,
      jiraLink: s.jira_link || undefined,
    })),
    participants: participants.map((p: any) => ({
      id: p.name, // Using name as ID for simplicity
      name: p.name,
      vote: p.vote_value,
      isScumMaster: p.is_scrum_master,
    })),
    votingActive: roomData.voting_state === "voting",
    votesRevealed: roomData.votes_revealed,
    timerSeconds: roomData.timer_duration,
    timerStartedAt: roomData.timer_end_time ? roomData.timer_end_time - roomData.timer_duration * 1000 : null,
    createdAt: new Date(roomData.created_at).getTime(),
  }
}

export async function createRoom() {
  const code = generateRoomCode()

  await sql`
    INSERT INTO rooms (code, scrum_master_name)
    VALUES (${code}, 'Scrum Master')
  `

  const room = await buildRoomObject(code)
  return { success: true, room }
}

export async function joinRoom(code: string, name: string, isScumMaster = false) {
  // Check if room exists
  const [room] = await sql`
    SELECT code FROM rooms WHERE code = ${code}
  `

  if (!room) {
    return { success: false, error: "Room not found" }
  }

  // Update last activity
  await sql`
    UPDATE rooms SET last_activity = NOW() WHERE code = ${code}
  `

  // Add participant (or update if exists)
  await sql`
    INSERT INTO participants (room_code, name, is_scrum_master)
    VALUES (${code}, ${name}, ${isScumMaster})
    ON CONFLICT (room_code, name) 
    DO UPDATE SET is_scrum_master = ${isScumMaster}
  `

  const roomData = await buildRoomObject(code)
  return { success: true, room: roomData, participantId: name }
}

export async function getRoomState(code: string) {
  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }

  // Update last activity
  await sql`
    UPDATE rooms SET last_activity = NOW() WHERE code = ${code}
  `

  return { success: true, room }
}

export async function submitVote(code: string, participantId: string, vote: number | null) {
  // Update last activity
  await sql`
    UPDATE rooms SET last_activity = NOW() WHERE code = ${code}
  `

  if (vote === null) {
    // Remove vote
    await sql`
      DELETE FROM votes 
      WHERE room_code = ${code} AND participant_name = ${participantId}
    `
  } else {
    // Insert or update vote
    await sql`
      INSERT INTO votes (room_code, participant_name, vote_value)
      VALUES (${code}, ${participantId}, ${vote})
      ON CONFLICT (room_code, participant_name)
      DO UPDATE SET vote_value = ${vote}, created_at = NOW()
    `
  }

  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }
  return { success: true, room }
}

export async function revealVotes(code: string) {
  await sql`
    UPDATE rooms 
    SET voting_state = 'revealed', 
        votes_revealed = true,
        last_activity = NOW()
    WHERE code = ${code}
  `

  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }
  return { success: true, room }
}

export async function startVoting(code: string, story?: Story, timerSeconds?: number) {
  // If a new story is provided, add it to the queue
  if (story) {
    const [maxOrder] = await sql`
      SELECT COALESCE(MAX(order_index), -1) as max_order
      FROM stories WHERE room_code = ${code}
    `

    await sql`
      INSERT INTO stories (room_code, title, jira_link, order_index)
      VALUES (${code}, ${story.title}, ${story.jiraLink || null}, ${maxOrder.max_order + 1})
    `
  }

  // Clear all votes
  await sql`
    DELETE FROM votes WHERE room_code = ${code}
  `

  // Update room state
  const timerEndTime = timerSeconds ? Date.now() + timerSeconds * 1000 : null

  await sql`
    UPDATE rooms 
    SET voting_state = 'voting',
        votes_revealed = false,
        timer_duration = ${timerSeconds || null},
        timer_end_time = ${timerEndTime},
        last_activity = NOW()
    WHERE code = ${code}
  `

  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }
  return { success: true, room }
}

export async function nextStory(code: string) {
  // Get current story index
  const [roomData] = await sql`
    SELECT current_story_index FROM rooms WHERE code = ${code}
  `

  if (!roomData) {
    return { success: false, error: "Room not found" }
  }

  // Clear votes and move to next story
  await sql`
    DELETE FROM votes WHERE room_code = ${code}
  `

  await sql`
    UPDATE rooms 
    SET current_story_index = ${roomData.current_story_index + 1},
        voting_state = 'idle',
        votes_revealed = false,
        timer_duration = NULL,
        timer_end_time = NULL,
        last_activity = NOW()
    WHERE code = ${code}
  `

  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }
  return { success: true, room }
}

export async function addStoryToQueue(code: string, story: Story) {
  const [maxOrder] = await sql`
    SELECT COALESCE(MAX(order_index), -1) as max_order
    FROM stories WHERE room_code = ${code}
  `

  await sql`
    INSERT INTO stories (room_code, title, jira_link, order_index)
    VALUES (${code}, ${story.title}, ${story.jiraLink || null}, ${maxOrder.max_order + 1})
  `

  await sql`
    UPDATE rooms SET last_activity = NOW() WHERE code = ${code}
  `

  const room = await buildRoomObject(code)
  if (!room) {
    return { success: false, error: "Room not found" }
  }
  return { success: true, room }
}
