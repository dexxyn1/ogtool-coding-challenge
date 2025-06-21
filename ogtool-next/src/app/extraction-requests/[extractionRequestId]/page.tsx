"use client";

import { ExtractionResultListComponent } from "@/features/extractionResult/list/ListComponent";
import { use } from "react";


interface ExtractionRequestPageProps {
    params: Promise<{ extractionRequestId: string }>;
}

export default function ExtractionRequestPage({ params }: ExtractionRequestPageProps) {
    const { extractionRequestId } = use(params);

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Extraction Details</h1>
            <ExtractionResultListComponent extractionRequestId={extractionRequestId} />
        </div>
    );
}
