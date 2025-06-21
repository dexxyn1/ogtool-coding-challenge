"use client";

import StepsComponent from '@/components/Steps/Steps';
import InformationDisplayListBuilder from '@/components/InformationDisplayBuilder/InformationDisplayListBuilder';
import { DisplayField } from '@/components/InformationDisplayBuilder/types';
import { Marriage } from "@/features/marriage/shared/types";
import { useMarriageList } from './hook';
// Assuming a CreateMarriagePopupButton exists or will be created, similar to CreatePersonalProfilePopupButton
// If not, the CTA in emptyDisplay might be omitted or use a generic button if available.
// import { CreateMarriagePopupButton } from '@/features/marriage/createPopupButton'; // Commented out

interface MarriageListProps {
    personalProfileId: string; // To pass to CreateMarriagePopupButton if needed
    onSelectItem: (item: Marriage) => void;
}

const MarriageList = ({ personalProfileId, onSelectItem }: MarriageListProps) => {
    const { 
        marriages, 
        isLoading,
        error,
        totalCount, 
        currentPage, 
        itemsPerPage, 
        goToPage, 
        setItemsPerPage
    } = useMarriageList({ personalProfileId });
    
    const displayFields: DisplayField[] = [
        {
            fieldName: 'marriageDate',
            displayName: 'Date of Marriage',
            displayType: 'DATE',
            tag: false,
        },
        {
            fieldName: 'status',
            displayName: 'Status',
            displayType: 'TEXT', // Or TAG if you have specific styling for enum
            tag: true, // Assuming status is an enum-like field
        },
    ];
    
    const emptyStateSteps = [
        { title: "Record Marriage", description: "Add marriage details for this profile." },
        { title: "Done", description: "The marriage information is saved." }
    ];

    const emptyDisplay = (
        <StepsComponent
            title="No marriage records found"            
            subtitle="Add marriage information for this personal profile."
            steps={emptyStateSteps}
            // showCta={true} // CTA and related props removed
            // cta={
            //     <CreateMarriagePopupButton 
            //         personalProfileId={personalProfileId} 
            //         onMarriageCreated={refetch} 
            //     />
            // }
        />
    );

    return (
        <div className="p-4">
            <InformationDisplayListBuilder<Marriage>
                fields={displayFields}
                items={marriages}
                showFilters={false} 
                getItemTitle={(marriage) => 
                    `Marriage (${marriage.profileId1} - ${marriage.profileId2}) on ${marriage.marriageDate ? new Date(marriage.marriageDate).toLocaleDateString() : 'N/A'}`
                }
                onSelectItem={onSelectItem}
                paginationEnabled={true}
                currentPage={currentPage ?? 1}
                totalCount={totalCount ?? 0}
                itemsPerPage={itemsPerPage}
                onPageChange={goToPage}
                onItemsPerPageChange={setItemsPerPage}
                isLoading={isLoading}
                error={error}
                emptyDisplay={emptyDisplay}
            />
        </div>
    );
};

export default MarriageList;