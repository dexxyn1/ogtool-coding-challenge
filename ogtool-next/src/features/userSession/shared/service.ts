import { UserSession } from './types';
import { createUserSessionRepository, IUserSessionRepository } from './repository';
import {
    Result,
    toErrorResult,
    toResult,
} from '@dexyn/common-library/result/resultUtils';

/**
 * Interface defining the contract for the UserSession Service business logic.
 */
export interface IUserSessionService {
    /**
     * Creates a new user session.
     * @param userId - The ID of the authenticated user performing the action.
     * @returns A Result containing the created UserSession data or an error.
     */
    create(userId: string): Promise<Result<UserSession>>;
    /**
     * Retrieves a specific user session by its ID.
     * @param userId - The ID of the authenticated user performing the action.
     * @param userSessionId - The ID of the user session to retrieve.
     * @returns A Result containing the UserSession data or an error.
     */
    retrieve(userId: string, userSessionId: string): Promise<Result<UserSession>>;
    /**
     * Deletes a specific user session by its ID.
     * @param userId - The ID of the authenticated user performing the action.
     * @param userSessionId - The ID of the user session to delete.
     * @returns A Result indicating success (null data) or failure.
     */
    delete(userId: string, userSessionId: string): Promise<Result<null>>;
}

/**
 * Factory function to create an instance of the UserSession Service.
 * Encapsulates business logic and interaction with the repository.
 * @returns An object implementing IUserSessionService.
 */
export const createUserSessionService = (): IUserSessionService => {

    const userSessionRepository: IUserSessionRepository = createUserSessionRepository();

    /** Creates a new user session record. */
    const create = async (userId: string): Promise<Result<UserSession>> => {
        try {
            console.debug(`[UserSession Service] User ${userId} creating user session with id ${userId}`);
            const newUserSession = await userSessionRepository.create({ id: userId });
            return toResult(newUserSession);
        } catch (error) {
            console.error(`[UserSession Service] User ${userId} error creating user session:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error creating user session';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Retrieves a specific user session by ID. */
    const retrieve = async (userId: string, userSessionId: string): Promise<Result<UserSession>> => {
        try {
            console.debug(`[UserSession Service] User ${userId} retrieving user session ${userSessionId}`);
            const userSession = await userSessionRepository.findById(userSessionId);
            if (!userSession) {
                return toErrorResult('NotFound', `UserSession with ID ${userSessionId} not found.`);
            }
            return toResult(userSession);
        } catch (error) {
            console.error(`[UserSession Service] User ${userId} error retrieving user session ${userSessionId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving user session';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Deletes a user session record. */
    const deleteSession = async (userId: string, userSessionId: string): Promise<Result<null>> => {
        try {
            console.debug(`[UserSession Service] User ${userId} deleting user session ${userSessionId}`);
            const deletedUserSession = await userSessionRepository.delete(userSessionId);
            if (!deletedUserSession) {
                 return toErrorResult('NotFound', `UserSession with ID ${userSessionId} not found or already deleted.`);
            }
            return toResult(null);
        } catch (error) {
            console.error(`[UserSession Service] User ${userId} error deleting user session ${userSessionId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error deleting user session';
            return toErrorResult('UnhandledError', message);
        }
    };

    return {
        create,
        retrieve,
        delete: deleteSession,
    };
};

// --- Singleton Factory Implementation ---
let userSessionServices: IUserSessionService | null = null;

/**
 * Gets the singleton instance of the UserSession Service.
 * Automatically determines whether to use the 'production' or 'test' instance
 * based on the application's demo mode status (via `isDemoModeActive`).
 * Creates the instance on first call for a given mode.
 * @param instanceNameOptional - Optional: Specifies the database instance ('production' | 'test').
 * If not provided, it will be determined by `isDemoModeActive()`.
 * @returns A promise resolving to the appropriate IUserSessionService instance.
 */
export const getUserSessionService = async (): Promise<IUserSessionService> => {

    if (userSessionServices) {
        return userSessionServices;
    } else {
        console.debug(`[Service Factory - UserSession] Creating production service instance.`);
        const newServiceInstance = createUserSessionService();
        userSessionServices = newServiceInstance;
        return newServiceInstance;
    }
}; 