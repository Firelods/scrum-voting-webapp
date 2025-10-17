/**
 * Jira Client - Direct calls from browser
 * 
 * This client makes direct calls to Jira from the browser.
 * This works when Jira is behind a corporate proxy/VPN because
 * the user's browser already has proxy access configured.
 * 
 * Benefits:
 * - Works with corporate proxy/VPN
 * - No need for server-side network configuration
 * 
 * Trade-offs:
 * - PAT is handled in browser (but only in memory, never stored unless user chooses)
 * - CORS must be enabled on Jira (usually OK for authenticated requests)
 */

export interface PublishVoteRequest {
    baseUrl: string;
    issueKey: string;
    username: string;
    pat: string;
    storyPoints: number;
    addComment?: boolean;
    updateStoryPoints?: boolean;
}

export interface PublishVoteResult {
    success: boolean;
    error?: string;
    warning?: string;
    results?: {
        commentAdded: boolean;
        storyPointsUpdated: boolean;
        updatedFields: string[];
    };
}

/**
 * Publish vote directly to Jira from the browser
 */
export async function publishVoteToJira(
    request: PublishVoteRequest
): Promise<PublishVoteResult> {
    const { baseUrl, issueKey, username, pat, storyPoints, addComment = true, updateStoryPoints = true } = request;

    // Sanitize baseUrl - remove trailing slash
    const sanitizedBaseUrl = baseUrl.replace(/\/$/, "");

    // Create Basic Auth header using username:PAT
    const authString = `${username}:${pat}`;
    const base64Auth = btoa(authString);

    const headers = {
        Authorization: `Basic ${base64Auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    // Track what actions were successful
    const results = {
        commentAdded: false,
        storyPointsUpdated: false,
        updatedFields: [] as string[],
    };

    try {
        // Action 1: Add comment to Jira issue
        if (addComment) {
            try {
                const commentBody = {
                    body: `Scrum Poker — L'équipe a voté *${storyPoints}* points pour cette user story.`,
                };

                const commentResponse = await fetch(
                    `${sanitizedBaseUrl}/rest/api/2/issue/${issueKey}/comment`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify(commentBody),
                    }
                );

                if (!commentResponse.ok) {
                    const errorData = await commentResponse.json().catch(() => ({}));
                    const errorMsg = 
                        errorData.errorMessages?.join(", ") ||
                        Object.values(errorData.errors || {}).join(", ") ||
                        `HTTP ${commentResponse.status}`;

                    // Return specific error messages for common issues
                    if (commentResponse.status === 401) {
                        return {
                            success: false,
                            error: "Authentication failed. Please check your username and Personal Access Token.",
                        };
                    } else if (commentResponse.status === 403) {
                        return {
                            success: false,
                            error: "Permission denied. You don't have access to this issue or permission to add comments.",
                        };
                    } else if (commentResponse.status === 404) {
                        return {
                            success: false,
                            error: `Issue ${issueKey} not found. Please check the issue key.`,
                        };
                    } else if (commentResponse.status === 0 || errorMsg.includes("CORS")) {
                        return {
                            success: false,
                            error: "CORS error: Unable to connect to Jira directly from browser. Your Jira instance may not allow browser requests.",
                        };
                    } else {
                        return {
                            success: false,
                            error: `Failed to add comment: ${errorMsg}`,
                        };
                    }
                }

                results.commentAdded = true;
                console.info(`Successfully added comment to ${issueKey}`);
            } catch (error) {
                console.error("Network error adding comment:", error);
                
                // Check if it's a CORS or network error
                if (error instanceof TypeError && error.message.includes("fetch")) {
                    return {
                        success: false,
                        error: "Network error: Unable to connect to Jira. Please check the base URL and ensure you're connected to the corporate network/VPN.",
                    };
                }
                
                return {
                    success: false,
                    error: "Network error connecting to Jira. Please check the base URL and your connection.",
                };
            }
        }

        // Action 2: Update story points field(s)
        if (updateStoryPoints) {
            try {
                // Get the custom field IDs from environment variable (comma-separated)
                const storyPointsFieldsEnv = process.env.NEXT_PUBLIC_JIRA_STORY_POINTS_FIELDS || "customfield_10166";
                const storyPointsFieldIds = storyPointsFieldsEnv
                    .split(",")
                    .map(field => field.trim())
                    .filter(field => field.length > 0);

                // Build the update body with all specified custom fields
                const updateBody = {
                    fields: storyPointsFieldIds.reduce((acc, fieldId) => {
                        acc[fieldId] = storyPoints;
                        return acc;
                    }, {} as Record<string, number>),
                };

                const updateResponse = await fetch(
                    `${sanitizedBaseUrl}/rest/api/2/issue/${issueKey}`,
                    {
                        method: "PUT",
                        headers,
                        body: JSON.stringify(updateBody),
                    }
                );

                if (!updateResponse.ok) {
                    // Story points update is optional - log but don't fail
                    const errorData = await updateResponse.json().catch(() => ({}));
                    const errorMsg =
                        errorData.errorMessages?.join(", ") ||
                        Object.values(errorData.errors || {}).join(", ") ||
                        `HTTP ${updateResponse.status}`;

                    console.warn(`Failed to update story points fields: ${errorMsg}`);

                    // If comment succeeded but story points failed, still return success but with a warning
                    if (results.commentAdded) {
                        return {
                            success: true,
                            warning: `Comment added successfully, but failed to update story points fields (${storyPointsFieldIds.join(", ")}). This might be due to field configuration. Error: ${errorMsg}`,
                            results,
                        };
                    }
                } else {
                    results.storyPointsUpdated = true;
                    results.updatedFields = storyPointsFieldIds;
                    console.info(`Successfully updated story points fields (${storyPointsFieldIds.join(", ")}) for ${issueKey}`);
                }
            } catch (error) {
                console.warn("Error updating story points:", error);
                // Non-critical error - continue if comment was successful
                if (results.commentAdded) {
                    return {
                        success: true,
                        warning: "Comment added successfully, but failed to update story points fields.",
                        results,
                    };
                }
            }
        }

        // Success response
        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error("Unexpected error publishing to Jira:", error);
        return {
            success: false,
            error: "An unexpected error occurred. Please try again.",
        };
    }
}
