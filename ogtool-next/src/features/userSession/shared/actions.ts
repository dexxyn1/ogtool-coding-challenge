"use server";

import { Result, ErrorName } from "@dexyn/common-library";
import { toErrorResult } from "@dexyn/common-library/result/resultUtils";
import { UserSession } from "@/features/userSession/shared/types";
import { getUserSessionService } from "./service";
import { getIronSessionService, saveUserSessionId } from "@/features/ironSession/service";
import { randomUUID } from "crypto";

/**
 * Server action to retrieve a user session.
 * If a session ID exists in the user's cookie, it retrieves the session.
 * If the session is not found in the database, or if no session ID exists in the cookie,
 * it creates a new session, saves the ID to the cookie, and returns the new session.
 * @returns Result containing the UserSession or an error.
 */
export const retrieveUserSessionAction = async (): Promise<Result<UserSession>> => {
    console.debug("[Action] Retrieving user session...");
    const ironSessionService = getIronSessionService();
    const sessionService = await getUserSessionService();

    // 1. Try to get the session ID from the iron session (cookie)
    const userSessionIdResult = await ironSessionService.getUserSessionId();

    if (userSessionIdResult.success) {
        const userSessionId = userSessionIdResult.data;
        console.debug(`[Action] Found existing user session ID ${userSessionId}. Retrieving...`);
        
        // 2. Session ID exists, try to retrieve the full session object from DB
        // The service's `retrieve` expects a userId and a sessionId. For guest sessions, these are the same.
        const retrieveResult = await sessionService.retrieve(userSessionId, userSessionId);
        
        if (retrieveResult.success) {
            console.debug(`[Action] Successfully retrieved session ${userSessionId}.`);
            return retrieveResult;
        }

        // If retrieval fails (e.g., session deleted from DB but still in cookie), we'll create a new one.
        console.warn(`[Action] Failed to retrieve session ${userSessionId} from DB. A new session will be created. Error: ${retrieveResult.error?.message}`);
    } else {
        console.debug(`[Action] No user session ID found in cookie. Creating a new one.`);
    }

    // 3. If we're here, we need to create a new session.
    try {
        const newSessionId = randomUUID();
        console.debug(`[Action] Creating new user session with ID ${newSessionId}...`);
        
        // The service's `create` method needs a "user ID". For a guest session, the new session ID can act as this identifier.
        const createResult = await sessionService.create(newSessionId);

        if (!createResult.success) {
            console.error("[Action] Failed to create new user session in DB:", createResult.error);
            return createResult;
        }

        // 4. Store the new session ID in the iron session cookie
        await saveUserSessionId(newSessionId);
        console.debug(`[Action] Successfully saved new session ID ${newSessionId} to iron-session.`);

        const retrieveResult = await sessionService.retrieve(newSessionId, newSessionId);
        if (!retrieveResult.success) {
            console.error("[Action] Failed to retrieve new user session in DB:", retrieveResult.error);
            return retrieveResult;
        }

        console.debug(`[Action] Successfully created new user session ${newSessionId} in DB.`);
        return createResult;

    } catch (error) {
        console.error("[Action] Unexpected error creating new user session:", error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

/**
 * Server action to delete a user session.
 * @param userSessionId - ID of the user session to delete.
 * @returns Result indicating success (null) or failure.
 */
export const deleteUserSessionAction = async (
    userSessionId: string
): Promise<Result<null>> => {
    const ironSessionService = getIronSessionService();
    const userIdResult = await ironSessionService.getUserSessionId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;
    
    console.debug(`[Action] User ${userId} deleting user session ${userSessionId}...`);
    const service = await getUserSessionService();
    try {
        const result = await service.delete(userId, userSessionId);
         if (!result.success) {
            console.error(`[Action] Failed to delete user session ${userSessionId}:`, result.error);
        } else {
            // Also destroy the iron session
            await ironSessionService.destroySession();
        }
        return result;
    } catch (error) {
        console.error(`[Action] Unexpected error deleting user session ${userSessionId}:`, error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
}; 