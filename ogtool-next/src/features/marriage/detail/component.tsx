"use client";

import StepsComponent from '@/components/Steps/Steps';
import InformationDisplayBuilder from '@/components/InformationDisplayBuilder/InformationDisplayBuilder';
import { DisplayField } from '@/components/InformationDisplayBuilder/types';
import { useMarriageDetail } from './hook';

interface MarriageDetailsProps {
    personalProfileId: string;
    marriageId: string;
}

const MarriageDetails = ({ personalProfileId, marriageId }: MarriageDetailsProps) => {
    const { 
        marriage, 
        isLoading,
        error 
    } = useMarriageDetail({ personalProfileId, marriageId });
    
    const displayFields: DisplayField[] = [
        {
            fieldName: 'spouseFullName',
            displayName: 'Spouse\'s Full Name',
            displayType: 'TEXT',
            tag: false,
        },
        {
            fieldName: 'marriageDate',
            displayName: 'Date of Marriage',
            displayType: 'DATE',
            tag: false,
        },
        {
            fieldName: 'marriageLocation',
            displayName: 'Location of Marriage',
            displayType: 'TEXT',
            tag: false,
        },
        // Add other fields like 'isCurrentMarriage', 'createdAt', 'updatedAt'
        {
            fieldName: 'createdAt',
            displayName: 'Record Created',
            displayType: 'DATE',
            tag: false,
        },
        {
            fieldName: 'updatedAt',
            displayName: 'Last Updated',
            displayType: 'DATE',
            tag: false,
        },
    ];
    
    const notFoundSteps = [
        { title: "Go to Profile", description: "Navigate back to the personal profile." },
        { title: "Select Marriage Record", description: "Choose the marriage record you want to view." },
    ];

    const emptyDisplay = (
        <StepsComponent
            title={"Marriage record not found"}
            subtitle={"The marriage record you are trying to view doesn't exist or could not be loaded."}
            steps={notFoundSteps}
            // No CTA as per pattern
        />
    );

    return (
        <div className="p-4">
            {/* No h1 title or edit AppLink as per pattern */}
            <InformationDisplayBuilder 
                fields={displayFields} 
                values={marriage ?? {}} 
                isLoading={isLoading} 
                error={error}
                emptyDisplay={emptyDisplay}
            />
        </div>
    );
};

export default MarriageDetails;