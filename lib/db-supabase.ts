import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
}

// Server-side Supabase client with service role for database operations
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    db: {
        schema: "public",
    },
    auth: {
        persistSession: false,
    },
});

// Helper to execute raw SQL queries (for complex queries)
export async function executeSQL(query: string, params: any[] = []) {
    const { data, error } = await supabaseServer.rpc("exec_sql", {
        query,
        params,
    });

    if (error) {
        console.error("SQL execution error:", error);
        throw error;
    }

    return data;
}

// Cleanup old rooms
export async function cleanupOldRooms() {
    try {
        const twentyFourHoursAgo = new Date(
            Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();

        const { error } = await supabaseServer
            .from("rooms")
            .delete()
            .lt("last_activity", twentyFourHoursAgo);

        if (error) {
            console.error("Failed to cleanup old rooms:", error);
        }
    } catch (error) {
        console.error("Failed to cleanup old rooms:", error);
    }
}
