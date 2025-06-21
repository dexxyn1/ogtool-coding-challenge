"use client";

import { useState, useEffect, useCallback } from 'react';
import { ErrorResult } from '@dexyn/common-library';
import { ExtractionRequest } from '../shared/types';
import { retrieveExtractionRequestListAction } from '../shared/actions';
import { useUserSession } from '@/features/userSession/provider/UserSessionProvider';

interface UseExtractionRequestListReturn {
    requests: ExtractionRequest[];
    isLoading: boolean;
    error: ErrorResult | null;
    fetchRequests: () => Promise<void>;
}

export const useExtractionRequestList = (): UseExtractionRequestListReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<ErrorResult | null>(null);
    const [requests, setRequests] = useState<ExtractionRequest[]>([]);
    const { isSessionSet } = useUserSession();

    const fetchRequests = useCallback(async () => {
        if (!isSessionSet) return;
        setIsLoading(true);
        setError(null);
        const result = await retrieveExtractionRequestListAction();
        if (result.success) {
            setRequests(result.data);
        } else {
            setError(result);
            setRequests([]); // Clear previous data on error
        }
        setIsLoading(false);
    }, [isSessionSet]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return {
        requests,
        isLoading,
        error,
        fetchRequests, // Expose a function to allow manual refetching
    };
}; 