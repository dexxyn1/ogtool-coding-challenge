"use client";

import { useState, useEffect, useCallback } from 'react';
import { ErrorResult } from '@dexyn/common-library';
import { ExtractionResult } from '../shared/types';
import { retrieveExtractionResultListAction } from '../shared/actions';

interface UseExtractionResultListProps {
    extractionRequestId: string;
}

interface UseExtractionResultListReturn {
    results: ExtractionResult[];
    isLoading: boolean;
    error: ErrorResult | null;
    fetchResults: () => Promise<void>;
}

export const useExtractionResultList = ({ extractionRequestId }: UseExtractionResultListProps): UseExtractionResultListReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<ErrorResult | null>(null);
    const [results, setResults] = useState<ExtractionResult[]>([]);

    const fetchResults = useCallback(async () => {
        if (!extractionRequestId) return;
        setIsLoading(true);
        setError(null);
        const result = await retrieveExtractionResultListAction(extractionRequestId);
        if (result.success) {
            setResults(result.data);
        } else {
            setError(result);
            setResults([]);
        }
        setIsLoading(false);
    }, [extractionRequestId]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    return {
        results,
        isLoading,
        error,
        fetchResults,
    };
}; 