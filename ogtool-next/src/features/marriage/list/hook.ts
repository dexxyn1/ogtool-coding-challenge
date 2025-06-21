"use client";

import { useState, useEffect, useCallback } from 'react';
import { Marriage } from '@/features/marriage/shared/types'; 
import { retrieveMarriageListAction } from '@/features/marriage/shared/actions';
import { ErrorResult, Result } from '@dexyn/common-library';
import { toErrorResult } from '@dexyn/common-library/result/resultUtils';
import { PaginationOptions } from '@/common/parameters/paginationOptions';

interface UseMarriageListProps {
    personalProfileId: string; 
}

export interface UseMarriageListReturn {
    marriages: Marriage[];
    isLoading: boolean;
    error: ErrorResult | null;
    totalCount: number | null;
    currentPage: number | null;
    itemsPerPage: number;
    goToPage: (page: number) => void;
    setItemsPerPage: (limit: number) => void;
    refetch: () => void;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

export const useMarriageList = ({ personalProfileId }: UseMarriageListProps): UseMarriageListReturn => {
    const [marriages, setMarriages] = useState<Marriage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<ErrorResult | null>(null);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState<number | null>(1);
    const [itemsPerPage, setItemsPerPageState] = useState<number>(DEFAULT_ITEMS_PER_PAGE);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!personalProfileId) {
                const validationError = toErrorResult("ValidationError", "Personal Profile ID is required.");
                setError(validationError);
                setMarriages([]);
                setTotalCount(null);
                return;
            }
            const pagination: PaginationOptions = { page: currentPage ?? 1, limit: itemsPerPage };
            const result = await retrieveMarriageListAction(personalProfileId, pagination) as Result<Marriage[]>; 
            
            if (result.success) {
                setMarriages(result.data);
                setTotalCount(result.totalCount ?? result.data.length);
                setCurrentPage(result.page ?? currentPage ?? 1);
            } else {
                setError(result); // result is ErrorResult
                setMarriages([]);
                setTotalCount(null);
            }
        } catch (e: unknown) {
            const unhandledError = toErrorResult('UnhandledError', e instanceof Error ? e.message : 'An unexpected error occurred while fetching marriage list.');
            setError(unhandledError);
            setMarriages([]);
            setTotalCount(null);
        } finally {
            setIsLoading(false);
        }
    }, [personalProfileId, currentPage, itemsPerPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const setItemsPerPage = useCallback((limit: number) => {
        setItemsPerPageState(limit);
        setCurrentPage(1); 
    }, []);

    return {
        marriages,
        isLoading,
        error,
        totalCount,
        currentPage,
        itemsPerPage,
        goToPage,
        setItemsPerPage,
        refetch: fetchData,
    };
}; 