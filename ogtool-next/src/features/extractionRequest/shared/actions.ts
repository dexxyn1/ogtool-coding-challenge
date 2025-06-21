"use server";

import { Result, ErrorName } from "@dexyn/common-library";
import { toErrorResult } from "@dexyn/common-library/result/resultUtils";
import {
    ExtractionRequest,
    CreateExtractionRequest,
    UpdateExtractionRequest
} from "./types";
import { getExtractionRequestService } from "./service";
import { getIronSessionService } from "@/features/ironSession/service";

const getSessionId = async (): Promise<Result<string>> => {
    const ironSessionService = getIronSessionService();
    const sessionIdResult = await ironSessionService.getUserSessionId();
    if (!sessionIdResult.success) {
        return toErrorResult(
            (sessionIdResult.error?.name as ErrorName) || "NotAuthorized", 
            sessionIdResult.error?.message || "User authentication failed."
        );
    }
    return sessionIdResult;
}

export const createExtractionRequestAction = async (
    data: CreateExtractionRequest
): Promise<Result<ExtractionRequest>> => {
    const sessionIdResult = await getSessionId();
    if (!sessionIdResult.success) return sessionIdResult;
    const userSessionId = sessionIdResult.data;
    console.debug(`[Action] Creating extraction request for user session ${userSessionId}.`);
    
    const service = await getExtractionRequestService();
    try {
        return await service.create(userSessionId, data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

export const retrieveExtractionRequestAction = async (
    extractionRequestId: string
): Promise<Result<ExtractionRequest>> => {
    const sessionIdResult = await getSessionId();
    if (!sessionIdResult.success) return sessionIdResult;
    const userSessionId = sessionIdResult.data;
    
    const service = await getExtractionRequestService();
    try {
        return await service.retrieve(userSessionId, extractionRequestId);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

export const retrieveExtractionRequestListAction = async (): Promise<Result<ExtractionRequest[]>> => {
    const sessionIdResult = await getSessionId();
    if (!sessionIdResult.success) return sessionIdResult;
    const userSessionId = sessionIdResult.data;
        
    const service = await getExtractionRequestService();
    try {
        return await service.retrieveList(userSessionId);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
};

export const updateExtractionRequestAction = async (
    extractionRequestId: string,
    data: UpdateExtractionRequest
): Promise<Result<ExtractionRequest>> => {
    const sessionIdResult = await getSessionId();
    if (!sessionIdResult.success) return sessionIdResult;
    const userSessionId = sessionIdResult.data;

    const service = await getExtractionRequestService();
    try {
        return await service.update(userSessionId, extractionRequestId, data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
}; 