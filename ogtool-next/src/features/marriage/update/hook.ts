"use client";

import { useState, useCallback } from 'react';
import { Result, ErrorResult } from '@dexyn/common-library';
import { toErrorResult } from '@dexyn/common-library/result/resultUtils';
import { FormBuilderField } from '@/components/FormBuilder/types';
import { Marriage, UpdateMarriage, UpdateMarriageSchema, MarriageStatusSchema } from '@/features/marriage/shared/types';
import { updateMarriageAction } from '@/features/marriage/shared/actions';

interface UseMarriageUpdateProps {
    personalProfileId: string;
    marriageId: string;
}

export interface UseMarriageUpdateReturn {
    isUpdating: boolean;
    error: ErrorResult | null;
    updateMarriage: (data: UpdateMarriage) => Promise<Result<Marriage>>;
    marriageFields: FormBuilderField[];
}

const marriageFields: FormBuilderField[] = [
    {
        fieldName: 'status',
        displayName: 'Marriage Status',
        inputType: 'RADIO',
        isVisible: true,
        editable: true,
        fieldChoices: MarriageStatusSchema.options.map(status => ({ 
            id: `status_${status.toLowerCase()}`,
            label: status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' '),
            value: status,
            fieldId: 'status' 
        })),
    },
    {
        fieldName: 'separationOrDivorceDate',
        displayName: 'Date of Separation/Divorce (if applicable)',
        inputType: 'DATE',
        isVisible: true,
        editable: true,
        fieldChoices: [],
    },
];

export const useMarriageUpdate = ({ personalProfileId, marriageId }: UseMarriageUpdateProps): UseMarriageUpdateReturn => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<ErrorResult | null>(null);

    const updateMarriage = useCallback(async (formData: UpdateMarriage): Promise<Result<Marriage>> => {
        setIsUpdating(true);
        setError(null);
        
        try {
            if (!personalProfileId || !marriageId) {
                const badRequestError = toErrorResult('BadRequest', 'Profile ID and Marriage ID are required.');
                setError(badRequestError);
                return badRequestError;
            }

            const validation = UpdateMarriageSchema.safeParse(formData);
            if (!validation.success) {
                const validationError = toErrorResult('BadRequest', validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
                setError(validationError);
                return validationError;
            }

            const result = await updateMarriageAction(personalProfileId, marriageId, validation.data) as Result<Marriage>;
            
            if (!result.success) {
                setError(result); 
            }
            return result; 
        } catch (e: unknown) {
            const unhandledError = toErrorResult('UnhandledError', e instanceof Error ? e.message : 'An unexpected error occurred during marriage update.');
            setError(unhandledError);
            return unhandledError;
        } finally {
            setIsUpdating(false);
        }
    }, [personalProfileId, marriageId]);

    return {
        updateMarriage,
        marriageFields,
        isUpdating,
        error,
    };
};