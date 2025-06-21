"use client";

import React, { useState } from 'react';
import { useExtractionRequestCreate } from './hook';
import { ErrorResult, Result } from '@dexyn/common-library';
import { ExtractionRequest } from '../shared/types';

interface ExtractionRequestCreateComponentProps {
    onSuccess?: (data: ExtractionRequest) => void;
    onError?: (error: ErrorResult) => void;
}

export const ExtractionRequestCreateComponent = ({ onSuccess, onError }: ExtractionRequestCreateComponentProps) => {
    const { 
        createExtractionRequest, 
        isCreating, 
        error 
    } = useExtractionRequestCreate();
    
    const [url, setUrl] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const result: Result<ExtractionRequest> = await createExtractionRequest({
            url,
            specialInstructions,
        });

        if (result.success) {
            if (onSuccess) {
                onSuccess(result.data);
            }
            // Reset the form on successful submission
            setUrl('');
            setSpecialInstructions('');
        } else if (!result.success && onError) {
            onError(result);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <h2>Create New Extraction Request</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="url">URL</label>
                <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    style={{ padding: '0.5rem' }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="specialInstructions">Special Instructions</label>
                <textarea
                    id="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., focus on the main content"
                    rows={4}
                    style={{ padding: '0.5rem' }}
                />
            </div>
            
            {error && (
                <div style={{ color: 'red', border: '1px solid red', padding: '0.5rem' }}>
                    <p><strong>{error.error.name}</strong>: {error.error.message}</p>
                    {error.error.details && (
                        <ul>
                            {Object.entries(error.error.details).map(([field, messages]) => (
                               <li key={field}>{field}: {(messages as string[]).join(', ')}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

                <button type="submit" disabled={isCreating} style={{ padding: '0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isCreating ? 'Creating...' : 'Create Request'}
            </button>
        </form>
    );
}; 