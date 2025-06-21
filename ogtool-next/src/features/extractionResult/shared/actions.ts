"use server";

import { Result, ErrorName } from "@dexyn/common-library";
import { toErrorResult } from "@dexyn/common-library/result/resultUtils";
import { ExtractionResult } from "./types";
import { getExtractionResultService } from "./service";
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

export const retrieveExtractionResultListAction = async (
    extractionRequestId: string
): Promise<Result<ExtractionResult[]>> => {
    const sessionIdResult = await getSessionId();
    if (!sessionIdResult.success) return sessionIdResult;
    const userSessionId = sessionIdResult.data;
        
    const service = await getExtractionResultService();
    try {
        return await service.retrieveList(userSessionId, extractionRequestId);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return toErrorResult("UnhandledError", message);
    }
}; 