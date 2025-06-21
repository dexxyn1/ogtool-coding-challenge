"use client";

import React from 'react';
import { Result } from '@dexyn/common-library';
import { useMarriageDetail } from '../detail/hook'; // Hook to fetch existing data
import { useMarriageUpdate } from './hook'; // Hook for update logic
import { Marriage, UpdateMarriage, UpdateMarriageSchema } from '@/features/marriage/shared/types';
import { Loading } from '@/components/Loading/Loading';
import { Updating } from '@/components/Updating/Updating'; // Component for updating state
import { ErrorResultDisplayComponent } from '@/components/ErrorResultDisplay/ErrorResultDisplayComponent';
import StepsComponent from '@/components/Steps/Steps';
import FormBuilder from '@/components/FormBuilder/FormBuilder'; // Default export

interface EditMarriageProps {
    personalProfileId: string;
    marriageId: string;
    onSuccess: (marriage: Marriage) => void; // Added onSuccess prop
}

const EditMarriage: React.FC<EditMarriageProps> = ({ personalProfileId, marriageId, onSuccess }) => {

    // 1. Fetch existing data
    const {
        marriage: existingMarriage,
        isLoading: isLoadingDetail,
        error: detailError
    } = useMarriageDetail({ personalProfileId, marriageId });

    // 2. Initialize update hook (conditionally, once data is loaded)
    // We pass null initially and let the effect handle setting the marriage data
    const {
        updateMarriage,
        marriageFields,
        isUpdating,
        error: updateError
    } = useMarriageUpdate({ personalProfileId, marriageId }); // Corrected props

    // 3. Define Save Handler
    const handleSave = async (data: UpdateMarriage): Promise<Result<UpdateMarriage>> => {
        const result = await updateMarriage(data); // This returns Result<Marriage>
        if (result.success) {
            onSuccess(result.data); // Call onSuccess with the actual Marriage entity
            // Return the input data for FormBuilder as per pattern
            return { success: true, data: data, warnings: [] } as Result<UpdateMarriage>;
        } else {
            // Error is handled by the hook and displayed via updateError state
            return result as Result<UpdateMarriage>; // Cast ErrorResult to Result<UpdateMarriage>
        }
    };

    // 4. Define Not Found Steps
    const notFoundSteps = [
        { title: 'Marriage Not Found', description: 'The requested marriage record could not be found.', status: 'error' as const },
        { title: 'Go Back', description: 'Return to the list of marriages.', status: 'upcoming' as const },
    ];

    // 5. Conditional Rendering
    if (isLoadingDetail) {
        return <Loading />;
    }
    if (isUpdating) {
        // Remove children from Updating component
        return <Updating />; 
    }
    if (detailError && detailError.error?.name !== 'NotFound') {
        // Show general fetch error
        return <ErrorResultDisplayComponent error={detailError} />;
    }
    if (!existingMarriage) {
        // Handle Not Found case using StepsComponent
        return (
             <div className="space-y-4">
                <StepsComponent steps={notFoundSteps} title="Error" subtitle="Could not load marriage details" />
            </div>
        );
    }

    // Determine partner ID for the title (used for context, but title itself removed)
    // const partnerProfileId = existingMarriage.profileId1 === personalProfileId ? existingMarriage.profileId2 : existingMarriage.profileId1;
    // const pageTitle = `Edit Marriage (with ${partnerProfileId})`;

    // 6. Render Form
    return (
        <div className="space-y-4">
            {/* <h1 className="text-2xl font-semibold">{pageTitle}</h1> Removed title */}
            {/* Display update-specific errors above the form */}
            {updateError && <ErrorResultDisplayComponent error={updateError} />}

            <FormBuilder<typeof UpdateMarriageSchema>
                fields={marriageFields}
                schema={UpdateMarriageSchema}
                saveHandler={handleSave}
                defaultValues={existingMarriage} // Pass fetched data as default values
                isLoading={isUpdating} // Pass isUpdating as isLoading
                error={updateError} // Pass updateError as error
            />
        </div>
    );
};

export default EditMarriage; 