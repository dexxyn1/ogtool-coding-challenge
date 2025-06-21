import { ExtractionResult } from './types';
import { createExtractionResultRepository, IExtractionResultRepository } from './repository';
import {
    Result,
    toErrorResult,
    toResult,
} from '@dexyn/common-library/result/resultUtils';
import { IExtractionRequestRepository, createExtractionRequestRepository } from '@/features/extractionRequest/shared/repository';

/**
 * Interface defining the contract for the ExtractionResult Service business logic.
 */
export interface IExtractionResultService {
    retrieveList(userSessionId: string, extractionRequestId: string): Promise<Result<ExtractionResult[]>>;
}

/**
 * Factory function to create an instance of the ExtractionResult Service.
 * @returns An object implementing IExtractionResultService.
 */
export const createExtractionResultService = (): IExtractionResultService => {
    const resultRepository: IExtractionResultRepository = createExtractionResultRepository();
    const requestRepository: IExtractionRequestRepository = createExtractionRequestRepository();

    const retrieveList = async (userSessionId: string, extractionRequestId: string): Promise<Result<ExtractionResult[]>> => {
        try {
            // Authorization: Check if the user owns the parent ExtractionRequest
            const parentRequest = await requestRepository.findById(extractionRequestId);
            if (!parentRequest) {
                return toErrorResult('NotFound', `ExtractionRequest with ID ${extractionRequestId} not found.`);
            }
            if (parentRequest.userSessionId !== userSessionId) {
                return toErrorResult('NotAuthorized', 'You are not authorized to view these extraction results.');
            }

            const results = await resultRepository.getAllForRequest(extractionRequestId);
            return toResult(results);
        } catch (error) {
            console.error(`[ExtractionResult Service] Error retrieving results for request ${extractionRequestId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving results';
            return toErrorResult('UnhandledError', message);
        }
    };

    return {
        retrieveList,
    };
};

// --- Singleton Factory Implementation ---
let serviceInstance: IExtractionResultService | null = null;

export const getExtractionResultService = async (): Promise<IExtractionResultService> => {
    if (!serviceInstance) {
        serviceInstance = createExtractionResultService();
    }
    return serviceInstance;
}; 