import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformRetryQueue from '../PlatformRetryQueue';
import { platformApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    platformApi: {
        getRetryQueue: vi.fn(),
    },
}));

describe('PlatformRetryQueue', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PlatformRetryQueue />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(platformApi.getRetryQueue).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no jobs', async () => {
        vi.mocked(platformApi.getRetryQueue).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 5 });
        renderComponent();
        expect(await screen.findByText('リトライジョブがありません')).toBeInTheDocument();
    });

    it('renders jobs data successfully', async () => {
        vi.mocked(platformApi.getRetryQueue).mockResolvedValue({
            items: [
                {
                    id: 'j1',
                    jobType: 'webhook',
                    tenantId: 't1',
                    tenantName: 'Acme Corp',
                    retryCount: 2,
                    maxRetries: 5,
                    status: 'pending',
                    lastError: 'Connection timeout',
                    nextRetryAt: '2023-01-01T01:00:00Z',
                    createdAt: '2023-01-01T00:00:00Z',
                }
            ],
            total_count: 1,
            page: 1,
            page_size: 5
        });

        renderComponent();

        expect(await screen.findAllByText('Acme Corp')).not.toHaveLength(0);
        expect(screen.getAllByText('Webhook')).not.toHaveLength(0);
        expect(screen.getAllByText('待機中')).not.toHaveLength(0);
        expect(screen.getAllByText('Connection timeout')).not.toHaveLength(0);
    });
});
