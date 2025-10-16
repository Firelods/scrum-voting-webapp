import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

export async function cleanupOldRooms() {
  try {
    await sql`
      DELETE FROM rooms 
      WHERE last_activity < NOW() - INTERVAL '24 hours'
    `
  } catch (error) {
    console.error("[v0] Failed to cleanup old rooms:", error)
  }
}
