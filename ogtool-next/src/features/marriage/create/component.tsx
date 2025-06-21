"use client";

import FormBuilder from '@/components/FormBuilder/FormBuilder';
import { Marriage, CreateMarriage, CreateMarriageSchema } from '@/features/marriage/shared/types';
import { Result } from '@dexyn/common-library';
import { useMarriageCreate } from './hook';

interface NewMarriageProps {
    personalProfileId: string; // Or other relevant ID
    onSuccess: (marriage: Marriage) => void;
}

const NewMarriage = ({ personalProfileId, onSuccess }: NewMarriageProps) => {
    const { 
        createMarriage,
        marriageFields,
        isCreating, 
        error 
    } = useMarriageCreate({ personalProfileId });
    
    const handleCreateMarriage = async (data: CreateMarriage): Promise<Result<Marriage>> => {
        // The hook's createMarriage function is assumed to handle adding personalProfileId if necessary
        const result = await createMarriage(data);
        if (result.success) {
            onSuccess(result.data);
        }
        return result;
    };
    
    return (
        <div className="p-4"> 
            <FormBuilder
                fields={marriageFields}
                schema={CreateMarriageSchema} 
                saveHandler={handleCreateMarriage} 
                defaultValues={{}} 
                isLoading={isCreating}
                error={error}
            />
        </div>
    );
};

export default NewMarriage;