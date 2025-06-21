"use client";

import { useState, useCallback, useMemo } from 'react';
import { Result, ErrorResult } from '@dexyn/common-library';
import { FormBuilderField } from '@/components/FormBuilder/types';
import { Marriage, CreateMarriage, CreateMarriageSchema, MarriageStatusSchema } from '@/features/marriage/shared/types';
import { createMarriageAction } from '../shared/actions';
import { usePersonalProfileFieldChoices } from '@/features/personalProfiles/shared/usePersonalProfileFieldChoices';

interface UseMarriageCreateProps {
    personalProfileId: string; // ID of the profile initiating the creation
}

interface UseMarriageCreateReturn {
    createMarriage: (data: CreateMarriage) => Promise<Result<Marriage>>;
    marriageFields: FormBuilderField[];
    isCreating: boolean;
    error: ErrorResult | null;
}

export const useMarriageCreate = ({ personalProfileId }: UseMarriageCreateProps): UseMarriageCreateReturn => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<ErrorResult | null>(null);
    const { choices: partnerProfileChoices, isLoading: partnerProfileChoicesLoading } = usePersonalProfileFieldChoices();

    // Define form fields for creating a marriage
    const marriageFields: FormBuilderField[] = useMemo(() => [
        {
            fieldName: 'profileId1',
            displayName: 'Your Profile ID',
            inputType: 'TEXT', // Display as text, potentially pre-filled and read-only
            fieldChoices: [],
            isVisible: false,
            editable: false, // Cannot change the initiating profile ID
            // Note: We'll set the default value in the component
        },
        {
            fieldName: 'profileId2',
            displayName: "Partner's Profile", // Updated display name
            inputType: 'RADIO',
            fieldChoices: partnerProfileChoices,
            loadingChoices: partnerProfileChoicesLoading,
            isVisible: true,
            editable: true,
        },
        {
            fieldName: 'marriageDate',
            displayName: 'Marriage Date',
            inputType: 'DATE',
            fieldChoices: [],
            isVisible: true,
            editable: true,
        },
        {
            fieldName: 'status',
            displayName: 'Initial Status (Optional)',
            inputType: 'RADIO',
            fieldChoices: MarriageStatusSchema.options.map((value: string) => ({
                 id: `status-option-${value}`,
                 label: value,
                 value: value,
                 fieldId: 'status'
            })),
            isVisible: true,
            editable: true,
             // Default is MARRIED via schema, so field isn't strictly required
        },
    ], [partnerProfileChoices, partnerProfileChoicesLoading]);

    const createMarriage = useCallback(async (data: CreateMarriage): Promise<Result<Marriage>> => {
        setIsCreating(true);
        setError(null);

        // Add the initiating personalProfileId to the data if it's not already set
        // (assuming profileId1 is the initiator for this form)
        const dataToSend = { ...data, profileId1: personalProfileId };

        // Validate input data against the create schema before sending
        const validationResult = CreateMarriageSchema.safeParse(dataToSend);
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

        const result = await createMarriageAction(personalProfileId, validationResult.data);

        if (!result.success) {
            setError(result);
        } else {
            setError(null);
        }

        setIsCreating(false);
        return result;
    }, [personalProfileId]);

    return {
        createMarriage,
        marriageFields,
        isCreating,
        error,
    };
}; 