"use client";
import { useState, useEffect, useCallback } from 'react';
import { ErrorResult } from '@dexyn/common-library';
import { Marriage } from '@/features/marriage/shared/types';
import { retrieveMarriageAction } from '@/features/marriage/shared/actions';
import { toErrorResult } from '@dexyn/common-library/result/resultUtils';

interface UseMarriageDetailProps {
    personalProfileId: string;
    marriageId: string;
}

export interface UseMarriageDetailReturn {
    marriage: Marriage | null;
    isLoading: boolean;
    error: ErrorResult | null;
}

export const useMarriageDetail = ({ personalProfileId, marriageId }: UseMarriageDetailProps): UseMarriageDetailReturn => {
    const [marriage, setMarriage] = useState<Marriage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<ErrorResult | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!personalProfileId || !marriageId) {
                const validationError = toErrorResult("ValidationError", "Personal Profile ID and Marriage ID are required.");
                setError(validationError);
                setMarriage(null);
                return;
            }
            const result = await retrieveMarriageAction(personalProfileId, marriageId);
            if (result.success) {
                setMarriage(result.data);
            } else {
                setError(result); // result is ErrorResult
                setMarriage(null);
            }
        } catch (e: unknown) {
            const unhandledError = toErrorResult('UnhandledError', e instanceof Error ? e.message : 'An unexpected error occurred while fetching marriage details.');
            setError(unhandledError);
            setMarriage(null);
        } finally {
            setIsLoading(false);
        }
    }, [personalProfileId, marriageId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        marriage,
        isLoading,
        error,
    };
}; 