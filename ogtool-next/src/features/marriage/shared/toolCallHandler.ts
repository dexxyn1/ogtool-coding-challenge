/**
 * @module features/marriage/shared/toolCallHandler
 *
 * @description
 * This module defines and registers tool handlers and definitions
 * for Marriage related actions, referencing types.ts and service.ts.
 */

import { Result } from "@dexyn/common-library";
import { toErrorResult, toResult } from "@dexyn/common-library/result/resultUtils";
import { getMarriageService } from "./service"; // Import service getter
import { PaginationOptions } from "@/common/parameters/paginationOptions";
import { CreateMarriage, UpdateMarriage } from "./types"; // Import marriage types
// --- Import required types from toolRunner ---
import { ValidatedToolHandler, ToolHandlerResultPayload, AssistantTool, RegisteredToolInfo, ArgumentValidator } from "@/features/toolRunner/shared/types";
import { z } from "zod"; // For potential future use or complex validation, though not used for basic types here

// --- Helper Functions ---
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Example enum for MarriageStatus (adjust as per your actual types.ts)
const MarriageStatusEnum = z.enum(['MARRIED', 'DIVORCED', 'SEPARATED', 'ANNULLED', 'WIDOWED']);
type MarriageStatus = z.infer<typeof MarriageStatusEnum>;

function isMarriageStatus(value: unknown): value is MarriageStatus {
    return MarriageStatusEnum.safeParse(value).success;
}

console.debug("[Marriage Tools] Registering tools...");

// --- Tool: createMarriageTool ---

const createMarriageToolDefinition: AssistantTool = {
    type: "function",
    function: {
        name: "createMarriageTool",
        description: "Creates a new marriage record. The calling user must be associated with one of the personal profiles in the marriage.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                personalProfileId: { type: "string", description: "The unique identifier (UUID) of the personal profile initiating the creation (must be one of the parties in the marriage)." },
                formData: {
                    type: "object",
                    description: "Data for the new marriage.",
                    properties: {
                        profileId1: { type: "string", description: "The unique identifier (UUID) of the first personal profile in the marriage." },
                        profileId2: { type: "string", description: "The unique identifier (UUID) of the second personal profile in the marriage." },
                        marriageDate: { type: "string", format: "date-time", description: "The date and time of the marriage, in ISO 8601 format (e.g., '2023-10-27T10:00:00Z')." },
                        status: { type: "string", enum: MarriageStatusEnum.options, description: "The current status of the marriage." },
                        countryOfMarriage: { type: "string", nullable: true, description: "Optional: The country where the marriage took place." },
                        stateOrProvinceOfMarriage: { type: "string", nullable: true, description: "Optional: The state or province where the marriage took place." },
                        cityOfMarriage: { type: "string", nullable: true, description: "Optional: The city where the marriage took place." },
                        marriageCertificateNumber: { type: "string", nullable: true, description: "Optional: The marriage certificate number." },
                        separationDate: { type: "string", format: "date-time", nullable: true, description: "Optional: The date of separation, if applicable, in ISO 8601 format." },
                        divorceDate: { type: "string", format: "date-time", nullable: true, description: "Optional: The date of divorce, if applicable, in ISO 8601 format." },
                        notes: { type: "string", nullable: true, description: "Optional: Any relevant notes about the marriage." }
                    },
                    required: ["profileId1", "profileId2", "marriageDate", "status"],
                    additionalProperties: false
                }
            },
            required: ["personalProfileId", "formData"],
            additionalProperties: false
        }
    }
};

interface CreateArgs {
    personalProfileId: string;
    formData: CreateMarriage; // Assuming CreateMarriage matches the formData structure
}

function isCreateArgs(args: unknown): args is CreateArgs {
    if (!isObject(args) || typeof args.personalProfileId !== 'string' || !isObject(args.formData)) return false;
    const data = args.formData as Record<string, unknown>;

    if (typeof data.profileId1 !== 'string' || data.profileId1.trim() === '') return false;
    if (typeof data.profileId2 !== 'string' || data.profileId2.trim() === '') return false;
    if (typeof data.marriageDate !== 'string' || isNaN(Date.parse(data.marriageDate))) return false;
    if (!isMarriageStatus(data.status)) return false;

    // Optional fields type checks
    if (data.countryOfMarriage !== undefined && data.countryOfMarriage !== null && typeof data.countryOfMarriage !== 'string') return false;
    if (data.stateOrProvinceOfMarriage !== undefined && data.stateOrProvinceOfMarriage !== null && typeof data.stateOrProvinceOfMarriage !== 'string') return false;
    if (data.cityOfMarriage !== undefined && data.cityOfMarriage !== null && typeof data.cityOfMarriage !== 'string') return false;
    if (data.marriageCertificateNumber !== undefined && data.marriageCertificateNumber !== null && typeof data.marriageCertificateNumber !== 'string') return false;
    if (data.separationDate !== undefined && data.separationDate !== null && (typeof data.separationDate !== 'string' || isNaN(Date.parse(data.separationDate)))) return false;
    if (data.divorceDate !== undefined && data.divorceDate !== null && (typeof data.divorceDate !== 'string' || isNaN(Date.parse(data.divorceDate)))) return false;
    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') return false;
    
    // Service level validation: profileId1 !== profileId2. Not strictly needed here if service handles it.
    // Service level validation: personalProfileId must be profileId1 or profileId2. Not strictly needed here.

    return true;
}

const handleCreateMarriage: ValidatedToolHandler = async (
    userId, validatedArgs, instanceName
): Promise<Result<ToolHandlerResultPayload>> => {
    const logPrefix = `[Marriage-Create (${instanceName})]`;
    const args = validatedArgs as unknown as CreateArgs;
    console.debug(`${logPrefix} User ${userId} executing create for profile ${args.personalProfileId} with data: ${JSON.stringify(args.formData)}.`);

    try {
        const service = await getMarriageService(instanceName);
        const result = await service.create(userId, args.personalProfileId, args.formData);

        if (result.success) {
            return toResult(JSON.stringify(result.data));
        } else {
            return result;
        }
    } catch (error) {
        console.error(`${logPrefix} Service execution error:`, error);
        return toErrorResult("UnhandledError", `Service execution failed. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createMarriageToolInfo: RegisteredToolInfo = {
    name: createMarriageToolDefinition.function.name,
    definition: createMarriageToolDefinition,
    handler: handleCreateMarriage,
    validator: isCreateArgs as ArgumentValidator
};

// --- Tool: retrieveMarriageTool ---

const retrieveMarriageToolDefinition: AssistantTool = {
    type: "function",
    function: {
        name: "retrieveMarriageTool",
        description: "Retrieves the details of a specific marriage record. The calling user must be associated with one of the personal profiles in the marriage.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                personalProfileId: { type: "string", description: "The unique identifier (UUID) of the personal profile requesting the record (must be one of the parties in the marriage)." },
                marriageId: { type: "string", description: "The unique identifier (UUID) of the marriage record to retrieve." }
            },
            required: ["personalProfileId", "marriageId"],
            additionalProperties: false
        }
    }
};

interface RetrieveArgs {
    personalProfileId: string;
    marriageId: string;
}

function isRetrieveArgs(args: unknown): args is RetrieveArgs {
    return isObject(args)
        && typeof args.personalProfileId === 'string' && args.personalProfileId.length > 0
        && typeof args.marriageId === 'string' && args.marriageId.length > 0;
}

const handleRetrieveMarriage: ValidatedToolHandler = async (
    userId, validatedArgs, instanceName
): Promise<Result<ToolHandlerResultPayload>> => {
    const logPrefix = `[Marriage-Retrieve (${instanceName})]`;
    const args = validatedArgs as unknown as RetrieveArgs;
    console.debug(`${logPrefix} User ${userId} executing retrieve for marriage ${args.marriageId} by profile ${args.personalProfileId}.`);

    try {
        const service = await getMarriageService(instanceName);
        const result = await service.retrieve(userId, args.personalProfileId, args.marriageId);

        if (result.success) {
            return toResult(JSON.stringify(result.data));
        } else {
            return result;
        }
    } catch (error) {
        console.error(`${logPrefix} Service execution error:`, error);
        return toErrorResult("UnhandledError", `Service execution failed. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const retrieveMarriageToolInfo: RegisteredToolInfo = {
    name: retrieveMarriageToolDefinition.function.name,
    definition: retrieveMarriageToolDefinition,
    handler: handleRetrieveMarriage,
    validator: isRetrieveArgs as ArgumentValidator
};

// --- Tool: retrieveMarriagesTool ---

const retrieveMarriagesToolDefinition: AssistantTool = {
    type: "function",
    function: {
        name: "retrieveMarriagesTool",
        description: "Retrieves a list of marriages involving a specific personal profile. Supports pagination.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                personalProfileId: { type: "string", description: "The unique identifier (UUID) of the personal profile whose marriages are to be retrieved." },
                pagination: {
                    type: "object",
                    description: "Optional: Parameters to control pagination. If omitted, defaults to the first page with a standard limit.",
                    properties: {
                        page: { type: "integer", minimum: 1, description: "Optional: The page number to retrieve (1-indexed). Defaults to 1." },
                        limit: { type: "integer", minimum: 1, description: "Optional: The maximum number of marriages to return per page. Defaults to system setting." }
                    },
                    required: [],
                    additionalProperties: false
                }
            },
            required: ["personalProfileId"],
            additionalProperties: false
        }
    }
};

interface RetrieveListArgs {
    personalProfileId: string;
    pagination?: PaginationOptions;
}

function isRetrieveListArgs(args: unknown): args is RetrieveListArgs {
    if (!isObject(args) || typeof args.personalProfileId !== 'string' || args.personalProfileId.length === 0) return false;

    if (args.pagination !== undefined) {
        if (!isObject(args.pagination)) return false;
        const p = args.pagination;
        if (p.page !== undefined && (typeof p.page !== 'number' || !Number.isInteger(p.page) || p.page < 1)) return false;
        if (p.limit !== undefined && (typeof p.limit !== 'number' || !Number.isInteger(p.limit) || p.limit < 1)) return false;
    }
    return true;
}

const handleRetrieveMarriageList: ValidatedToolHandler = async (
    userId, validatedArgs, instanceName
): Promise<Result<ToolHandlerResultPayload>> => {
    const logPrefix = `[Marriage-RetrieveList (${instanceName})]`;
    const args = validatedArgs as unknown as RetrieveListArgs;
    console.debug(`${logPrefix} User ${userId} executing retrieveList for profile ${args.personalProfileId}.`);

    try {
        const service = await getMarriageService(instanceName);
        const result = await service.retrieveList(userId, args.personalProfileId, args.pagination);

        if (result.success) {
            return toResult(JSON.stringify(result.data));
        } else {
            return result;
        }
    } catch (error) {
        console.error(`${logPrefix} Service execution error:`, error);
        return toErrorResult("UnhandledError", `Service execution failed. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const retrieveMarriagesToolInfo: RegisteredToolInfo = {
    name: retrieveMarriagesToolDefinition.function.name,
    definition: retrieveMarriagesToolDefinition,
    handler: handleRetrieveMarriageList,
    validator: isRetrieveListArgs as ArgumentValidator
};

// --- Tool: updateMarriageTool ---

const updateMarriageToolDefinition: AssistantTool = {
    type: "function",
    function: {
        name: "updateMarriageTool",
        description: "Updates specific fields of an existing marriage record. The calling user must be associated with one of the personal profiles in the marriage.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                personalProfileId: { type: "string", description: "The unique identifier (UUID) of the personal profile initiating the update (must be one of the parties in the marriage)." },
                marriageId: { type: "string", description: "The unique identifier (UUID) of the marriage record to update." },
                formData: {
                    type: "object",
                    description: "An object containing only the fields to be updated with their new values. Profile IDs cannot be updated.",
                    properties: {
                        // profileId1 and profileId2 are typically not updatable.
                        marriageDate: { type: "string", format: "date-time", nullable: true, description: "The updated date and time of the marriage." },
                        status: { type: "string", enum: MarriageStatusEnum.options, nullable: true, description: "The updated status of the marriage." },
                        countryOfMarriage: { type: "string", nullable: true, description: "The updated country of marriage." },
                        stateOrProvinceOfMarriage: { type: "string", nullable: true, description: "The updated state or province of marriage." },
                        cityOfMarriage: { type: "string", nullable: true, description: "The updated city of marriage." },
                        marriageCertificateNumber: { type: "string", nullable: true, description: "The updated marriage certificate number." },
                        separationDate: { type: "string", format: "date-time", nullable: true, description: "The updated date of separation." },
                        divorceDate: { type: "string", format: "date-time", nullable: true, description: "The updated date of divorce." },
                        notes: { type: "string", nullable: true, description: "Updated notes about the marriage." }
                    },
                    required: [], // No specific field is required, but formData itself must not be empty.
                    additionalProperties: false
                }
            },
            required: ["personalProfileId", "marriageId", "formData"],
            additionalProperties: false
        }
    }
};

interface UpdateArgs {
    personalProfileId: string;
    marriageId: string;
    formData: UpdateMarriage; // Assuming UpdateMarriage matches the formData structure
}

function isUpdateArgs(args: unknown): args is UpdateArgs {
    if (!isObject(args)
        || typeof args.personalProfileId !== 'string' || args.personalProfileId.length === 0
        || typeof args.marriageId !== 'string' || args.marriageId.length === 0
        || !isObject(args.formData)) {
        return false;
    }
    const data = args.formData as Record<string, unknown>;
    if (Object.keys(data).length === 0) return false; // At least one field must be provided for an update

    if (data.marriageDate !== undefined && data.marriageDate !== null && (typeof data.marriageDate !== 'string' || isNaN(Date.parse(data.marriageDate)))) return false;
    if (data.status !== undefined && data.status !== null && !isMarriageStatus(data.status)) return false;
    if (data.countryOfMarriage !== undefined && data.countryOfMarriage !== null && typeof data.countryOfMarriage !== 'string') return false;
    if (data.stateOrProvinceOfMarriage !== undefined && data.stateOrProvinceOfMarriage !== null && typeof data.stateOrProvinceOfMarriage !== 'string') return false;
    if (data.cityOfMarriage !== undefined && data.cityOfMarriage !== null && typeof data.cityOfMarriage !== 'string') return false;
    if (data.marriageCertificateNumber !== undefined && data.marriageCertificateNumber !== null && typeof data.marriageCertificateNumber !== 'string') return false;
    if (data.separationDate !== undefined && data.separationDate !== null && (typeof data.separationDate !== 'string' || isNaN(Date.parse(data.separationDate)))) return false;
    if (data.divorceDate !== undefined && data.divorceDate !== null && (typeof data.divorceDate !== 'string' || isNaN(Date.parse(data.divorceDate)))) return false;
    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') return false;

    return true;
}

const handleUpdateMarriage: ValidatedToolHandler = async (
    userId, validatedArgs, instanceName
): Promise<Result<ToolHandlerResultPayload>> => {
    const logPrefix = `[Marriage-Update (${instanceName})]`;
    const args = validatedArgs as unknown as UpdateArgs;
    console.debug(`${logPrefix} User ${userId} executing update for marriage ${args.marriageId} by profile ${args.personalProfileId}.`);

    try {
        const service = await getMarriageService(instanceName);
        const result = await service.update(userId, args.personalProfileId, args.marriageId, args.formData);

        if (result.success) {
            return toResult(JSON.stringify(result.data));
        } else {
            return result;
        }
    } catch (error) {
        console.error(`${logPrefix} Service execution error:`, error);
        return toErrorResult("UnhandledError", `Service execution failed. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateMarriageToolInfo: RegisteredToolInfo = {
    name: updateMarriageToolDefinition.function.name,
    definition: updateMarriageToolDefinition,
    handler: handleUpdateMarriage,
    validator: isUpdateArgs as ArgumentValidator
};

// --- Tool: softDeleteMarriageTool ---

const softDeleteMarriageToolDefinition: AssistantTool = {
    type: "function",
    function: {
        name: "softDeleteMarriageTool",
        description: "Marks a specific marriage record as deleted. The calling user must be associated with one of the personal profiles in the marriage.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                personalProfileId: { type: "string", description: "The unique identifier (UUID) of the personal profile initiating the deletion (must be one of the parties in the marriage)." },
                marriageId: { type: "string", description: "The unique identifier (UUID) of the marriage record to soft-delete." }
            },
            required: ["personalProfileId", "marriageId"],
            additionalProperties: false
        }
    }
};

interface DeleteArgs {
    personalProfileId: string;
    marriageId: string;
}

function isDeleteArgs(args: unknown): args is DeleteArgs {
    return isObject(args)
        && typeof args.personalProfileId === 'string' && args.personalProfileId.length > 0
        && typeof args.marriageId === 'string' && args.marriageId.length > 0;
}

const handleSoftDeleteMarriage: ValidatedToolHandler = async (
    userId, validatedArgs, instanceName
): Promise<Result<ToolHandlerResultPayload>> => {
    const logPrefix = `[Marriage-Delete (${instanceName})]`;
    const args = validatedArgs as unknown as DeleteArgs;
    console.debug(`${logPrefix} User ${userId} executing softDelete for marriage ${args.marriageId} by profile ${args.personalProfileId}.`);

    try {
        const service = await getMarriageService(instanceName);
        const result = await service.softDelete(userId, args.personalProfileId, args.marriageId);
        // softDelete service returns Result<null> on success
        if (result.success) {
            return toResult("Successfully deleted marriage record."); // Or provide a more structured success message
        } else {
            return result;
        }
    } catch (error) {
        console.error(`${logPrefix} Service execution error:`, error);
        return toErrorResult("UnhandledError", `Service execution failed. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const softDeleteMarriageToolInfo: RegisteredToolInfo = {
    name: softDeleteMarriageToolDefinition.function.name,
    definition: softDeleteMarriageToolDefinition,
    handler: handleSoftDeleteMarriage,
    validator: isDeleteArgs as ArgumentValidator
};

console.debug("[Marriage Tools] Registrations complete.");

// Important: Remember to import and register these tool infos in your main tool registry setup.
// e.g., in a central toolRegistry.ts or similar:
// import { createMarriageToolInfo, retrieveMarriageToolInfo, ... } from '@/features/marriage/shared/toolCallHandler';
// toolRegistry.register(createMarriageToolInfo);
// toolRegistry.register(retrieveMarriageToolInfo);
// ... etc. 