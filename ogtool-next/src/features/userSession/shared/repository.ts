import { UserSession as UserSessionPrismaModel } from '@/generated/prisma/client';
import { UserSession, UserSessionCreationData } from './types';
import { getPrismaClient } from '@/infrastructure/prismaClient';

/**
 * Interface defining the contract for UserSession data access operations.
 */
export interface IUserSessionRepository {
    /** Finds a single user session by its ID. */
    findById(id: string): Promise<UserSession | null>;
    /** Creates a new user session record. */
    create(data: UserSessionCreationData): Promise<UserSession>;
    /** Hard-deletes a user session record by ID. */
    delete(id: string): Promise<UserSession | null>;
}

// Helper function to map Prisma model to domain model
const mapPrismaModelToDomain = (prismaUserSession: UserSessionPrismaModel): UserSession => {
    return {
        ...prismaUserSession,
    };
};

/**
 * Factory function to create an instance of the UserSession Repository.
 * Encapsulates data access logic using Prisma.
 * @param instanceName - Specifies the database instance ('production' or 'test') to connect to.
 * @returns An object implementing IUserSessionRepository.
 */
export const createUserSessionRepository = (): IUserSessionRepository => {
    const prisma = getPrismaClient();

    return {
        async findById(id: string): Promise<UserSession | null> {
            const userSession = await prisma.userSession.findUnique({
                where: { id },
            });
            return userSession ? mapPrismaModelToDomain(userSession) : null;
        },

        async create(data: UserSessionCreationData): Promise<UserSession> {
            const newUserSession = await prisma.userSession.create({
                data,
            });
            return mapPrismaModelToDomain(newUserSession);
        },

        async delete(id: string): Promise<UserSession | null> {
            try {
                const deletedUserSession = await prisma.userSession.delete({
                    where: { id },
                });
                return mapPrismaModelToDomain(deletedUserSession);
            } catch (error) {
                if (error) {
                    return null;
                }
                console.error(`[Repo - UserSession] Error deleting user session ${id}:`, error);
                throw error;
            }
        },
    };
}; 