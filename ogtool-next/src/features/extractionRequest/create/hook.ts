"use client";

import { useState, useCallback } from 'react';
import { Result, ErrorResult } from '@dexyn/common-library';
import { ExtractionRequest, CreateExtractionRequest, CreateExtractionRequestSchema } from '../shared/types';
import { createExtractionRequestAction } from '../shared/actions';
import { useUserSession } from '@/features/userSession/provider/UserSessionProvider';
import { toErrorResult } from '@dexyn/common-library/result/resultUtils';

interface UseExtractionRequestCreateReturn {
    createExtractionRequest: (data: CreateExtractionRequest) => Promise<Result<ExtractionRequest>>;
    isCreating: boolean;
    error: ErrorResult | null;
}

export const useExtractionRequestCreate = (): UseExtractionRequestCreateReturn => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<ErrorResult | null>(null);
    const { isSessionSet } = useUserSession();
    const createExtractionRequest = useCallback(async (data: CreateExtractionRequest): Promise<Result<ExtractionRequest>> => {
        if (!isSessionSet) return toErrorResult("UnhandledError", "User session is not set.");
        setIsCreating(true);
        setError(null);

        const validationResult = CreateExtractionRequestSchema.safeParse(data);
        if (!validationResult.success) {
            setIsCreating(false);
            const validationError: ErrorResult = {
                success: false,
                error: {
                    name: 'ValidationFailed',
                    message: 'Input validation failed',
                    details: validationResult.error.flatten().fieldErrors
                }
            };
            setError(validationError);
            return validationError;
        }

        const result = await createExtractionRequestAction(validationResult.data);

        if (!result.success) {
            setError(result);
        } else {
            setError(null);
        }

        setIsCreating(false);
        return result;
    }, [isSessionSet]);

    return {
        createExtractionRequest,
        isCreating,
        error,
    };
}; 