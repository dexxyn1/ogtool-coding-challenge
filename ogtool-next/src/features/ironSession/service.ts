import { cookies } from "next/headers";
import { getIronSession, IronSession } from "iron-session";
import { UserIronSession } from "./types";
import { userSessionOptions } from "./constants";
import { Result, toResult, toErrorResult } from "@dexyn/common-library/result/resultUtils";

export interface IIronSessionService {
    getUserSessionId(): Promise<Result<string>>;
    setUserSessionId(userSessionId: string): Promise<Result<void>>;
    destroySession(): Promise<Result<void>>;
}

async function getSession(): Promise<IronSession<UserIronSession>> {
    const cookieStore = await cookies();
    const session = await getIronSession<UserIronSession>(cookieStore, userSessionOptions);
    return session;
}

export async function saveUserSessionId(userSessionId: string): Promise<void> {
    try {
        const session = await getSession();
        session.userSessionId = userSessionId;
        await session.save();
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        throw new Error(message);
    }
}

export const getIronSessionService = (): IIronSessionService => {

    const getUserSessionId = async (): Promise<Result<string>> => {
        try {
            const session = await getSession();
            if (!session.userSessionId) {
                return toErrorResult("NotAuthorized", "User session not found in iron-session.");
            }
            return toResult(session.userSessionId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred.";
            return toErrorResult("UnhandledError", message);
        }
    };

    const setUserSessionId = async (userSessionId: string): Promise<Result<void>> => {
        try {
            await saveUserSessionId(userSessionId);
            console.debug(`[IronSessionService] Successfully set user session ID ${userSessionId} in iron-session.`);
            return toResult(undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred.";
            return toErrorResult("UnhandledError", message);
        }
    };
    
    const destroySession = async (): Promise<Result<void>> => {
        try {
            const session = await getSession();
            session.destroy();
            return toResult(undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred.";
            return toErrorResult("UnhandledError", message);
        }
    };

    return {
        getUserSessionId,
        setUserSessionId,
        destroySession,
    };
}