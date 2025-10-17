import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Jira API Route Handler - Publish Vote to Jira
 * 
 * This endpoint publishes Scrum Poker voting results to a Jira issue.
 * It uses Personal Access Token (PAT) authentication via Basic Auth.
 * 
 * Authentication:
 * - Uses Basic Auth with username:PAT encoded in base64
 * - The PAT is never logged or stored, only used in-memory for the request
 * 
 * Supported Actions:
 * 1. Add a comment to the Jira issue with the vote result
 * 2. Update one or multiple story points custom fields (if configured)
 * 
 * Environment Variables:
 * - JIRA_STORY_POINTS_FIELDS: Comma-separated custom field IDs for story points
 *   Examples: "customfield_10016" or "customfield_10016,customfield_10004"
 */

interface PublishVoteRequest {
    baseUrl: string;
    issueKey: string;
    username: string;
    pat: string;
    storyPoints: number;
    addComment?: boolean;
    updateStoryPoints?: boolean;
}

interface JiraError {
    errorMessages?: string[];
    errors?: Record<string, string>;
}

/**
 * POST /api/jira/publish-vote
 * 
 * Publishes the team's vote to a Jira issue
 */
export async function POST(request: NextRequest) {
    try {
        const body: PublishVoteRequest = await request.json();

        // Validate required fields
        if (!body.baseUrl || !body.issueKey || !body.username || !body.pat) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: baseUrl, issueKey, username, or pat",
                },
                { status: 400 }
            );
        }

        if (typeof body.storyPoints !== "number" || body.storyPoints < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid story points value. Must be a positive number.",
                },
                { status: 400 }
            );
        }

        // Sanitize baseUrl - remove trailing slash
        const baseUrl = body.baseUrl.replace(/\/$/, "");

        // Create Basic Auth header using username:PAT
        const authString = `${body.username}:${body.pat}`;
        const base64Auth = Buffer.from(authString).toString("base64");

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

        // Action 1: Add comment to Jira issue
        if (body.addComment !== false) {
            try {
                const commentBody = {
                    body: `Scrum Poker — L'équipe a voté *${body.storyPoints}* points pour cette user story.`,
                };

                const commentResponse = await fetch(
                    `${baseUrl}/rest/api/2/issue/${body.issueKey}/comment`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify(commentBody),
                    }
                );

                if (!commentResponse.ok) {
                    const errorData: JiraError = await commentResponse.json().catch(() => ({}));
                    const errorMsg = errorData.errorMessages?.join(", ") || 
                                   Object.values(errorData.errors || {}).join(", ") ||
                                   `HTTP ${commentResponse.status}`;
                    
                    logger.error(`Failed to add comment to Jira: ${errorMsg}`);
                    
                    // Return specific error messages for common issues
                    if (commentResponse.status === 401) {
                        return NextResponse.json(
                            {
                                success: false,
                                error: "Authentication failed. Please check your username and Personal Access Token.",
                            },
                            { status: 401 }
                        );
                    } else if (commentResponse.status === 403) {
                        return NextResponse.json(
                            {
                                success: false,
                                error: "Permission denied. You don't have access to this issue or permission to add comments.",
                            },
                            { status: 403 }
                        );
                    } else if (commentResponse.status === 404) {
                        return NextResponse.json(
                            {
                                success: false,
                                error: `Issue ${body.issueKey} not found. Please check the issue key.`,
                            },
                            { status: 404 }
                        );
                    } else {
                        return NextResponse.json(
                            {
                                success: false,
                                error: `Failed to add comment: ${errorMsg}`,
                            },
                            { status: commentResponse.status }
                        );
                    }
                }

                results.commentAdded = true;
                logger.info(`Successfully added comment to ${body.issueKey}`);
            } catch (error) {
                logger.error("Network error adding comment:", error);
                return NextResponse.json(
                    {
                        success: false,
                        error: "Network error connecting to Jira. Please check the base URL and your connection.",
                    },
                    { status: 500 }
                );
            }
        }

        // Action 2: Update story points field(s)
        if (body.updateStoryPoints !== false) {
            try {
                // Get the custom field IDs from environment variable (comma-separated)
                const storyPointsFieldsEnv = process.env.JIRA_STORY_POINTS_FIELDS || "customfield_10166";
                const storyPointsFieldIds = storyPointsFieldsEnv
                    .split(",")
                    .map(field => field.trim())
                    .filter(field => field.length > 0);

                if (storyPointsFieldIds.length === 0) {
                    logger.warn("No story points fields configured in JIRA_STORY_POINTS_FIELDS");
                } else {
                    // Build the update body with all specified custom fields
                    const updateBody = {
                        fields: storyPointsFieldIds.reduce((acc, fieldId) => {
                            acc[fieldId] = body.storyPoints;
                            return acc;
                        }, {} as Record<string, number>),
                    };

                    logger.info(`Updating story points fields: ${storyPointsFieldIds.join(", ")} with value ${body.storyPoints}`);

                    const updateResponse = await fetch(
                        `${baseUrl}/rest/api/2/issue/${body.issueKey}`,
                        {
                            method: "PUT",
                            headers,
                            body: JSON.stringify(updateBody),
                        }
                    );

                    if (!updateResponse.ok) {
                        // Story points update is optional - log but don't fail
                        const errorData: JiraError = await updateResponse.json().catch(() => ({}));
                        const errorMsg = errorData.errorMessages?.join(", ") || 
                                       Object.values(errorData.errors || {}).join(", ") ||
                                       `HTTP ${updateResponse.status}`;
                        
                        logger.warn(`Failed to update story points fields: ${errorMsg}`);
                        
                        // If comment succeeded but story points failed, still return success but with a warning
                        if (results.commentAdded) {
                            return NextResponse.json({
                                success: true,
                                warning: `Comment added successfully, but failed to update story points fields (${storyPointsFieldIds.join(", ")}). This might be due to field configuration. Error: ${errorMsg}`,
                                results,
                            });
                        }
                    } else {
                        results.storyPointsUpdated = true;
                        results.updatedFields = storyPointsFieldIds;
                        logger.info(`Successfully updated story points fields (${storyPointsFieldIds.join(", ")}) for ${body.issueKey}`);
                    }
                }
            } catch (error) {
                logger.warn("Error updating story points:", error);
                // Non-critical error - continue if comment was successful
                if (results.commentAdded) {
                    return NextResponse.json({
                        success: true,
                        warning: "Comment added successfully, but failed to update story points fields.",
                        results,
                    });
                }
            }
        }

        // Success response
        return NextResponse.json({
            success: true,
            message: `Successfully published ${body.storyPoints} points to ${body.issueKey}`,
            results,
        });

    } catch (error) {
        logger.error("Unexpected error in publish-vote API:", error);
        return NextResponse.json(
            {
                success: false,
                error: "An unexpected error occurred. Please try again.",
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
