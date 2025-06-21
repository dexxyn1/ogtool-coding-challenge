"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useExtractionResultList } from './hook';

interface ExtractionResult {
    id: string;
    title: string;
    author: string;
    contentType: string;
    content: string;
    sourceUrl: string;
}

interface ExtractionResultListComponentProps {
    extractionRequestId: string;
}

const DialogStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const DialogContentStyles: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '80%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    color: '#333',
};

const CloseButtonStyles: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#333',
};

const ContentDialog = ({ result, onClose }: { result: ExtractionResult; onClose: () => void }) => {
    return (
        <div style={DialogStyles} onClick={onClose}>
            <div style={DialogContentStyles} onClick={(e) => e.stopPropagation()}>
                <button style={CloseButtonStyles} onClick={onClose}>&times;</button>
                <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{result.title}</h3>
                <div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export const ExtractionResultListComponent = ({ extractionRequestId }: ExtractionResultListComponentProps) => {
    const { results, isLoading, error, fetchResults } = useExtractionResultList({ extractionRequestId });
    const [selectedResult, setSelectedResult] = useState<ExtractionResult | null>(null);

    if (isLoading) {
        return <div>Loading results...</div>;
    }

    if (error) {
        return (
            <div style={{ color: 'red', marginTop: '1rem' }}>
                <p>Error fetching results: {error.error.message}</p>
                <button onClick={fetchResults}>Try Again</button>
            </div>
        );
    }

    if (results.length === 0) {
        return <div style={{ marginTop: '1rem' }}><p>No results found for this request yet.</p></div>;
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Extraction Results</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {results.map((result: ExtractionResult) => (
                    <li key={result.id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{result.title}</h4>
                        <p style={{ fontStyle: 'italic', color: '#555' }}>by {result.author} | Type: {result.contentType}</p>
                        <p style={{ marginTop: '0.5rem', cursor: 'pointer' }} onClick={() => setSelectedResult(result)}>
                            {result.content.substring(0, 200)}...
                        </p>
                        <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>View Source</a>
                    </li>
                ))}
            </ul>
            {selectedResult && (
                <ContentDialog result={selectedResult} onClose={() => setSelectedResult(null)} />
            )}
        </div>
    );
}; 