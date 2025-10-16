import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
export const schema = process.env.DATABASE_SCHEMA || "scrum_poker";

if (!databaseUrl) {
    throw new Error(
        "POSTGRES_URL or DATABASE_URL environment variable is not set"
    );
}

// Use Neon with Supabase connection
export const sql = neon(databaseUrl);

export async function cleanupOldRooms() {
    try {
        // Note: Schema prefix will be handled in SQL migrations
        await sql`
      DELETE FROM rooms 
      WHERE last_activity < NOW() - INTERVAL '24 hours'
    `;
    } catch (error) {
        console.error("Failed to cleanup old rooms:", error);
    }
}
