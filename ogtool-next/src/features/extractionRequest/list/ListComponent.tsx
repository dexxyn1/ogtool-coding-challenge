"use client";

import React from 'react';
import { useExtractionRequestList } from './hook';
import { useRouter } from 'next/navigation';

export const ExtractionRequestListComponent = () => {
    const { requests, isLoading, error, fetchRequests } = useExtractionRequestList();
    const router = useRouter();

    if (isLoading) {
        return <div>Loading extraction requests...</div>;
    }

    if (error) {
        return (
            <div style={{ color: 'red' }}>
                <p>Error fetching requests: {error.error.message}</p>
                <button onClick={fetchRequests}>Try Again</button>
            </div>
        );
    }

    const handleRequestClick = (requestId: string) => {
        router.push(`/extraction-requests/${requestId}`);
    };

    return (
        <div>
            <h2>Extraction Requests</h2>
            <button onClick={fetchRequests} style={{ marginBottom: '1rem', cursor: 'pointer', color: '#007bff' }}>
                Refresh List
            </button>
            {requests.length === 0 ? (
                <p>No extraction requests found.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {requests.map((request) => (
                        <li
                            key={request.id}
                            style={{
                                border: '1px solid #ccc',
                                padding: '1rem',
                                marginBottom: '1rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                            onClick={() => handleRequestClick(request.id)}
                        >
                            <p>
                                <strong>URL:</strong>{' '}
                                <a
                                    href={request.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {request.url}
                                </a>
                            </p>
                            <p><strong>ID:</strong> {request.id}</p>
                            <p><strong>Instructions:</strong> {request.specialInstructions || 'None'}</p>
                            <p><strong>Status:</strong> {request.isCompleted ? 'Completed' : 'Pending'}</p>
                            <p><strong>Created:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}; 