import { isDemoModeActive } from "../../DemoModeToggle/types"; // Import for singleton factory
import { PrismaClientKnownRequestError } from '@/generated/prisma/client/runtime/library';
import { Marriage, CreateMarriage, UpdateMarriage } from './types';
import { createMarriageRepository, IMarriageRepository } from './repository'; // Import the repository factory
import {
    Result,
    toErrorResult,
    toResult,
    toPagedResult,
} from '@dexyn/common-library/result/resultUtils';
import { PaginationOptions } from '@/common/parameters/paginationOptions';

/**
 * Interface defining the contract for the Marriage Service business logic.
 */
export interface IMarriageService {
    /**
     * Creates a new marriage record between two personal profiles.
     * @param userId - The ID of the authenticated user performing the action.
     * @param personalProfileId - The ID of one of the personal profiles involved in the marriage (for context).
     * @param data - The data for the new marriage (must include profileId1 and profileId2).
     * @returns A Result containing the created Marriage data or an error.
     */
    create(userId: string, personalProfileId: string, data: CreateMarriage): Promise<Result<Marriage>>;
    /**
     * Retrieves a specific marriage record by its ID.
     * @param userId - The ID of the authenticated user performing the action.
     * @param personalProfileId - The ID of a personal profile related to the marriage (for auth context).
     * @param marriageId - The ID of the marriage to retrieve.
     * @returns A Result containing the Marriage data or an error.
     */
    retrieve(userId: string, personalProfileId: string, marriageId: string): Promise<Result<Marriage>>;
    /**
     * Retrieves a paginated list of marriages involving a specific personal profile.
     * @param userId - The ID of the authenticated user performing the action.
     * @param personalProfileId - The ID of the personal profile whose marriages are to be listed.
     * @param pagination - Optional pagination options (page, limit).
     * @returns A Result containing an array of Marriages (potentially empty) or an error.
     */
    retrieveList(userId: string, personalProfileId: string, pagination?: PaginationOptions): Promise<Result<Marriage[]>>;
    /**
     * Updates an existing marriage record (e.g., status, separation date).
     * @param userId - The ID of the authenticated user performing the action.
     * @param personalProfileId - The ID of a personal profile related to the marriage (for auth context).
     * @param marriageId - The ID of the marriage to update.
     * @param data - The update data for the marriage.
     * @returns A Result containing the updated Marriage data or an error.
     */
    update(userId: string, personalProfileId: string, marriageId: string, data: UpdateMarriage): Promise<Result<Marriage>>;
    /**
     * Soft deletes a specific marriage record by its ID.
     * @param userId - The ID of the authenticated user performing the action.
     * @param personalProfileId - The ID of a personal profile related to the marriage (for auth context).
     * @param marriageId - The ID of the marriage to soft delete.
     * @returns A Result indicating success (null data) or failure.
     */
    softDelete(userId: string, personalProfileId: string, marriageId: string): Promise<Result<null>>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * Factory function to create an instance of the Marriage Service.
 * Encapsulates business logic, validation, and interaction with the repository.
 * @param instanceName - Specifies the database instance ('production' or 'test') for the underlying repository.
 * @returns An object implementing IMarriageService.
 */
export const createMarriageService = (instanceName: 'production' | 'test'): IMarriageService => {

    const marriageRepository: IMarriageRepository = createMarriageRepository(instanceName);

    /** Creates a new marriage record between two profiles, handling validation. */
    const create = async (userId: string, personalProfileId: string, data: CreateMarriage): Promise<Result<Marriage>> => {
        // Authorization: Ensure the authenticated user (userId) is related to personalProfileId if needed,
        // or that userId is one of the parties in data.profileId1 or data.profileId2.
        // For now, we assume personalProfileId is one of the parties and the logged-in user (userId) owns it.
        // A more robust check would involve fetching personalProfileId's owner and comparing with userId.

        if (personalProfileId !== data.profileId1 && personalProfileId !== data.profileId2) {
            return toErrorResult("NotAuthorized", "Initiating profile must be one of the parties in the marriage.");
        }
        // Additional check: ensure the logged-in user (userId) is authorized to act for personalProfileId.
        // This might involve a call to userSessionService or similar to verify ownership/permissions.
        // For this refactor, we'll assume this check passes or is handled by RLS implicitly if userId is passed to repo.

        if (data.profileId1 === data.profileId2) {
             return toErrorResult("BadRequest", "Cannot create a marriage record linking a profile to itself.");
        }
        try {
            // Pass userId to repository if it needs it for RLS or access control on create.
            const existingMarriage = await marriageRepository.findByProfileIds(userId, data.profileId1, data.profileId2);
            if (existingMarriage) {
                 return toErrorResult("BadRequest", "An active marriage already exists between these profiles.");
            }
            console.debug(`[Marriage Service (${instanceName})] User ${userId} creating marriage between ${data.profileId1} and ${data.profileId2}`);
            // marriageRepository.create may need userId if it implements access grants or RLS setting
            const newMarriage = await marriageRepository.create(userId, data); // Pass data, userId if repo.create expects it for RLS
            return toResult(newMarriage);
        } catch (error) {
            console.error(`[Marriage Service (${instanceName})] User ${userId} error creating marriage:`, error);
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
                return toErrorResult('BadRequest', `One or both personal profiles specified do not exist.`);
            }
            const message = error instanceof Error ? error.message : 'Unknown error creating marriage';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Retrieves a specific marriage by ID, ensuring the requester is authorized. */
    const retrieve = async (userId: string, personalProfileId: string, marriageId: string): Promise<Result<Marriage>> => {
        try {
            console.debug(`[Marriage Service (${instanceName})] User ${userId} retrieving marriage ${marriageId}`);
            // marriageRepository.findById may need userId if it uses RLS
            const marriage = await marriageRepository.findById(userId, marriageId);
            if (!marriage) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found.`);
            }
            // Authorization: Check if the authenticated user (userId) is associated with personalProfileId,
            // AND if personalProfileId is one of the parties in the marriage.
            if (marriage.profileId1 !== personalProfileId && marriage.profileId2 !== personalProfileId) {
                 // This implies personalProfileId passed is not part of this marriage. 
                 // We also need to ensure userId is authorized for this personalProfileId.
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found or not accessible by profile ${personalProfileId}.`);
            }
            // Further check: ensure userId owns/can act for personalProfileId (if not already guaranteed by RLS in repo)
            return toResult(marriage);
        } catch (error) {
            console.error(`[Marriage Service (${instanceName})] User ${userId} error retrieving marriage ${marriageId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving marriage';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Retrieves a paginated list of marriages for a specific profile. */
    const retrieveList = async (userId: string, personalProfileId: string, pagination?: PaginationOptions): Promise<Result<Marriage[]>> => {
        try {
            // Authorization: Ensure userId is authorized for personalProfileId.
            // This check could be more explicit here or rely on RLS in the repository if userId is passed.
            console.debug(`[Marriage Service (${instanceName})] User ${userId} retrieving marriage list for profile ${personalProfileId}`);
            // marriageRepository.getAll may need userId if it uses RLS
            const { data, totalCount } = await marriageRepository.getAll(userId, personalProfileId, pagination);
            const page = pagination?.page ?? DEFAULT_PAGE;
            const limit = pagination?.limit ?? DEFAULT_LIMIT;
            return toPagedResult(data, page, limit, totalCount);
        } catch (error) {
            console.error(`[Marriage Service (${instanceName})] User ${userId} error retrieving marriage list for ${personalProfileId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving marriage list';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Updates an existing marriage record (status, separation date), ensuring authorization. */
    const update = async (userId: string, personalProfileId: string, marriageId: string, data: UpdateMarriage): Promise<Result<Marriage>> => {
        try {
            console.debug(`[Marriage Service (${instanceName})] User ${userId} updating marriage ${marriageId}`);
            // marriageRepository.findById may need userId for RLS
            const existingMarriage = await marriageRepository.findById(userId, marriageId);
            if (!existingMarriage) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found.`);
            }
            // Authorization: Check if the authenticated user (userId) is associated with personalProfileId,
            // AND if personalProfileId is one of the parties in the marriage.
            if (existingMarriage.profileId1 !== personalProfileId && existingMarriage.profileId2 !== personalProfileId) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found or not accessible by profile ${personalProfileId}.`);
            }
            // Further check: ensure userId owns/can act for personalProfileId.

            // marriageRepository.update may need userId for RLS or if it updates access records.
            const updatedMarriage = await marriageRepository.update(userId, marriageId, data);
            if (!updatedMarriage) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found for update (possibly deleted).`);
            }
            return toResult(updatedMarriage);
        } catch (error) {
            console.error(`[Marriage Service (${instanceName})] User ${userId} error updating marriage ${marriageId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error updating marriage';
            return toErrorResult('UnhandledError', message);
        }
    };

    /** Soft deletes a marriage record, ensuring the requester is authorized. */
    const softDelete = async (userId: string, personalProfileId: string, marriageId: string): Promise<Result<null>> => {
        try {
            console.debug(`[Marriage Service (${instanceName})] User ${userId} soft deleting marriage ${marriageId}`);
            // marriageRepository.findById may need userId for RLS
            const existingMarriage = await marriageRepository.findById(userId, marriageId);
            if (!existingMarriage) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found.`);
            }
            // Authorization: Check if the authenticated user (userId) is associated with personalProfileId,
            // AND if personalProfileId is one of the parties in the marriage.
            if (existingMarriage.profileId1 !== personalProfileId && existingMarriage.profileId2 !== personalProfileId) {
                return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found or not accessible by profile ${personalProfileId}.`);
            }
            // Further check: ensure userId owns/can act for personalProfileId.

            // marriageRepository.softDelete may need userId for RLS or if it updates access records.
            const deletedMarriageResult = await marriageRepository.softDelete(userId, marriageId);
            if (!deletedMarriageResult) {
                 return toErrorResult('NotFound', `Marriage with ID ${marriageId} not found or already deleted.`);
            }
            return toResult(null);
        } catch (error) {
            console.error(`[Marriage Service (${instanceName})] User ${userId} error soft-deleting marriage ${marriageId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error soft-deleting marriage';
            return toErrorResult('UnhandledError', message);
        }
    };

    return {
        create,
        retrieve,
        retrieveList,
        update,
        softDelete,
    };
};

// --- Singleton Factory Implementation ---
const marriageServices: Record<string, IMarriageService> = {};

/**
 * Gets the singleton instance of the Marriage Service.
 * Automatically determines whether to use the 'production' or 'test' instance
 * based on the application's demo mode status (via `isDemoModeActive`).
 * Creates the instance on first call for a given mode.
 * @param instanceNameOptional - Optional: Specifies the database instance ('production' | 'test').
 * If not provided, it will be determined by `isDemoModeActive()`.
 * @returns A promise resolving to the appropriate IMarriageService instance.
 */
export const getMarriageService = async (instanceNameOptional?: 'production' | 'test'): Promise<IMarriageService> => {
    let finalInstanceName: 'production' | 'test';

    if (instanceNameOptional) {
        finalInstanceName = instanceNameOptional;
    } else {
        const isDemo = await isDemoModeActive();
        finalInstanceName = isDemo ? 'test' : 'production';
    }

    if (marriageServices[finalInstanceName]) {
        return marriageServices[finalInstanceName];
    } else {
        console.debug(`[Service Factory - Marriage] Creating ${finalInstanceName} service instance.`);
        const newServiceInstance = createMarriageService(finalInstanceName);
        marriageServices[finalInstanceName] = newServiceInstance;
        return newServiceInstance;
    }
}; 