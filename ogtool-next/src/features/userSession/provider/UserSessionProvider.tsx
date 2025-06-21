"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ErrorResult, Result } from '@dexyn/common-library';
import { UserSession } from '../shared/types';
import { retrieveUserSessionAction } from '../shared/actions';
import { toErrorResult } from '@dexyn/common-library/result/resultUtils';

interface UserSessionContextType {
    session: UserSession | null;
    isLoading: boolean;
    error: ErrorResult | null;
    isSessionSet: boolean;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export const UserSessionProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<ErrorResult | null>(null);
    const [isSessionSet, setIsSessionSet] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                setIsLoading(true);
                const result: Result<UserSession> = await retrieveUserSessionAction();
                if (result.success) {
                    setSession(result.data);
                    setIsSessionSet(true);
                } else {
                    setError(result || toErrorResult("UnhandledError", "Failed to retrieve user session."));
                }
            } catch (e) {
                setError(toErrorResult("UnhandledError", "An unknown error occurred."));
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();
    }, []); // Empty dependency array ensures this runs only once on mount

    const value = { session, isLoading, error, isSessionSet };

    return (
        <UserSessionContext.Provider value={value}>
            {children}
        </UserSessionContext.Provider>
    );
};

export const useUserSession = () => {
    const context = useContext(UserSessionContext);
    if (context === undefined) {
        throw new Error('useUserSession must be used within a UserSessionProvider');
    }
    return context;
}; 