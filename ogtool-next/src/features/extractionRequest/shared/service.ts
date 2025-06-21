import { ExtractionRequest, CreateExtractionRequest, UpdateExtractionRequest } from './types';
import { createExtractionRequestRepository, IExtractionRequestRepository } from './repository';
import {
    Result,
    toErrorResult,
    toResult,
} from '@dexyn/common-library/result/resultUtils';
import { getExtractionRequestQueueService } from './queueService';

/**
 * Interface defining the contract for the ExtractionRequest Service business logic.
 */
export interface IExtractionRequestService {
    create(userSessionId: string, data: CreateExtractionRequest): Promise<Result<ExtractionRequest>>;
    retrieve(userSessionId: string, extractionRequestId: string): Promise<Result<ExtractionRequest>>;
    retrieveList(userSessionId: string): Promise<Result<ExtractionRequest[]>>;
    update(userSessionId: string, extractionRequestId: string, data: UpdateExtractionRequest): Promise<Result<ExtractionRequest>>;
}

/**
 * Factory function to create an instance of the ExtractionRequest Service.
 * @returns An object implementing IExtractionRequestService.
 */
export const createExtractionRequestService = (): IExtractionRequestService => {
    const requestRepository: IExtractionRequestRepository = createExtractionRequestRepository();

    const create = async (userSessionId: string, data: CreateExtractionRequest): Promise<Result<ExtractionRequest>> => {
        try {
            const newRequest = await requestRepository.create(userSessionId, data);
            const queueService = await getExtractionRequestQueueService();
            const publishResult = await queueService.publishExtractionRequest(newRequest);
            if (!publishResult.success) {
                console.error(`[ExtractionRequest Service] Error publishing extraction request for user session ${userSessionId}:`, publishResult.error);
                return publishResult;
            }
            return toResult(newRequest);
        } catch (error) {
            console.error(`[ExtractionRequest Service] Error creating request for user session ${userSessionId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error creating request';
            return toErrorResult('UnhandledError', message);
        }
    };

    const retrieve = async (userSessionId: string, extractionRequestId: string): Promise<Result<ExtractionRequest>> => {
        try {
            const request = await requestRepository.findById(extractionRequestId);
            if (!request) {
                return toErrorResult('NotFound', `ExtractionRequest with ID ${extractionRequestId} not found.`);
            }
            if (request.userSessionId !== userSessionId) {
                return toErrorResult('NotAuthorized', `Not authorized to view ExtractionRequest with ID ${extractionRequestId}.`);
            }
            return toResult(request);
        } catch (error) {
            console.error(`[ExtractionRequest Service] Error retrieving request ${extractionRequestId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving request';
            return toErrorResult('UnhandledError', message);
        }
    };

    const retrieveList = async (userSessionId: string): Promise<Result<ExtractionRequest[]>> => {
        try {
            const requests = await requestRepository.getAllForUser(userSessionId);
            return toResult(requests);
        } catch (error) {
            console.error(`[ExtractionRequest Service] Error retrieving request list for user session ${userSessionId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error retrieving request list';
            return toErrorResult('UnhandledError', message);
        }
    };

    const update = async (userSessionId: string, extractionRequestId: string, data: UpdateExtractionRequest): Promise<Result<ExtractionRequest>> => {
        try {
            const existingRequest = await requestRepository.findById(extractionRequestId);
            if (!existingRequest) {
                return toErrorResult('NotFound', `ExtractionRequest with ID ${extractionRequestId} not found.`);
            }
            if (existingRequest.userSessionId !== userSessionId) {
                return toErrorResult('NotAuthorized', `Not authorized to update ExtractionRequest with ID ${extractionRequestId}.`);
            }
            const updatedRequest = await requestRepository.update(extractionRequestId, data);
            if (!updatedRequest) {
                return toErrorResult('NotFound', `ExtractionRequest with ID ${extractionRequestId} not found for update.`);
            }
            return toResult(updatedRequest);
        } catch (error) {
            console.error(`[ExtractionRequest Service] Error updating request ${extractionRequestId}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error updating request';
            return toErrorResult('UnhandledError', message);
        }
    };

    return {
        create,
        retrieve,
        retrieveList,
        update,
    };
};

// --- Singleton Factory Implementation ---
let serviceInstance: IExtractionRequestService | null = null;

export const getExtractionRequestService = async (): Promise<IExtractionRequestService> => {
    if (!serviceInstance) {
        console.debug(`[Service Factory - ExtractionRequest] Creating service instance.`);
        serviceInstance = createExtractionRequestService();
    }
    return serviceInstance;
}; 