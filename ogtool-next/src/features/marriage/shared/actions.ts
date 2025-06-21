"use server";

import { Result, ErrorName } from "@dexyn/common-library";
import { toErrorResult } from "@dexyn/common-library/result/resultUtils";
import { PaginationOptions } from "@/common/parameters/paginationOptions";
import {
    Marriage,
    CreateMarriage,
    UpdateMarriage
} from "@/features/marriage/shared/types";

import { getMarriageService } from "./service";
import { getUserSessionService } from '@/features/Authentication/userSession/userSessionService';

/**
 * Server action to create a new marriage record.
 * Performs authentication check before calling the service.
 * @param personalProfileId - The ID of the initiating personal profile.
 * @param data - Marriage creation data.
 * @returns Result containing the created Marriage or an error.
 */
export const createMarriageAction = async (
    personalProfileId: string,
    data: CreateMarriage
): Promise<Result<Marriage>> => {
    const userIdResult = await getUserSessionService().getUserId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;
    
    console.debug(`[Action] User ${userId} creating marriage for profile ${personalProfileId}...`);
    const service = await getMarriageService();
    try {
        const result = await service.create(userId, personalProfileId, data);
        if (!result.success) {
            console.error("[Action] Failed to create marriage:", result.error);
        }
        return result;
    } catch (error) {
        console.error("[Action] Unexpected error creating marriage:", error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

/**
 * Server action to retrieve a specific marriage record.
 * Performs authentication check before calling the service.
 * @param personalProfileId - ID of the requesting profile (for auth context by service).
 * @param marriageId - ID of the marriage to retrieve.
 * @returns Result containing the Marriage or an error.
 */
export const retrieveMarriageAction = async (
    personalProfileId: string,
    marriageId: string
): Promise<Result<Marriage>> => {
    const userIdResult = await getUserSessionService().getUserId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;
    
    console.debug(`[Action] User ${userId} retrieving marriage ${marriageId} for profile ${personalProfileId}...`);
    const service = await getMarriageService();
    try {
        const result = await service.retrieve(userId, personalProfileId, marriageId);
        if (!result.success && result.error?.name !== "NotFound") {
             console.error(`[Action] Failed to retrieve marriage ${marriageId}:`, result.error);
        }
        return result;
    } catch (error) {
        console.error(`[Action] Unexpected error retrieving marriage ${marriageId}:`, error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

/**
 * Server action to retrieve a list of marriages for a profile.
 * Performs authentication check before calling the service.
 * @param personalProfileId - ID of the profile whose marriages to list.
 * @param pagination - Optional pagination parameters.
 * @returns Result containing an array of Marriages or an error.
 */
export const retrieveMarriageListAction = async (
    personalProfileId: string,
    pagination?: PaginationOptions
): Promise<Result<Marriage[]>> => {
    const userIdResult = await getUserSessionService().getUserId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;
        
    console.debug(`[Action] User ${userId} retrieving marriage list for profile ${personalProfileId}...`);
    const service = await getMarriageService();
    try {
        const result = await service.retrieveList(userId, personalProfileId, pagination);
         if (!result.success) {
            console.error("[Action] Failed to retrieve marriage list:", result.error);
        }
        return result;
    } catch (error) {
        console.error("[Action] Unexpected error retrieving marriage list:", error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

/**
 * Server action to update a marriage record.
 * Performs authentication check before calling the service.
 * @param personalProfileId - ID of the requesting profile (for auth context by service).
 * @param marriageId - ID of the marriage to update.
 * @param data - Update data.
 * @returns Result containing the updated Marriage or an error.
 */
export const updateMarriageAction = async (
    personalProfileId: string,
    marriageId: string,
    data: UpdateMarriage
): Promise<Result<Marriage>> => {
    const userIdResult = await getUserSessionService().getUserId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;

    console.debug(`[Action] User ${userId} updating marriage ${marriageId} for profile ${personalProfileId}...`);
    const service = await getMarriageService();
    try {
        const result = await service.update(userId, personalProfileId, marriageId, data);
         if (!result.success) {
            console.error(`[Action] Failed to update marriage ${marriageId}:`, result.error);
        }
        return result;
    } catch (error) {
        console.error(`[Action] Unexpected error updating marriage ${marriageId}:`, error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

/**
 * Server action to soft-delete a marriage record.
 * Performs authentication check before calling the service.
 * @param personalProfileId - ID of the requesting profile (for auth context by service).
 * @param marriageId - ID of the marriage to delete.
 * @returns Result indicating success (null) or failure.
 */
export const softDeleteMarriageAction = async (
    personalProfileId: string,
    marriageId: string
): Promise<Result<null>> => {
    const userIdResult = await getUserSessionService().getUserId();
    if (!userIdResult.success) {
        return toErrorResult(
            (userIdResult.error?.name as ErrorName) || "NotAuthorized", 
            userIdResult.error?.message || "User authentication failed."
        );
    }
    const userId = userIdResult.data;
    
    console.debug(`[Action] User ${userId} soft deleting marriage ${marriageId} for profile ${personalProfileId}...`);
    const service = await getMarriageService();
    try {
        const result = await service.softDelete(userId, personalProfileId, marriageId);
         if (!result.success) {
            console.error(`[Action] Failed to soft delete marriage ${marriageId}:`, result.error);
        }
        return result;
    } catch (error) {
        console.error(`[Action] Unexpected error soft deleting marriage ${marriageId}:`, error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
}; 