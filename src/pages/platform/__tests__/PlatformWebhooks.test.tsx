import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformWebhooks from '../PlatformWebhooks';
import { platformApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    platformApi: {
        getWebhooks: vi.fn(),
    },
}));

describe('PlatformWebhooks', () => {
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
                    <PlatformWebhooks />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(platformApi.getWebhooks).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no webhooks', async () => {
        vi.mocked(platformApi.getWebhooks).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 5 });
        renderComponent();
        expect(await screen.findByText('該当するWebhookがありません')).toBeInTheDocument();
    });

    it('renders webhooks data successfully and can open detail dialog', async () => {
        const user = userEvent.setup();
        vi.mocked(platformApi.getWebhooks).mockResolvedValue({
            items: [
                {
                    id: 'wh1',
                    stripeEventId: 'evt_123',
                    eventType: 'customer.subscription.created',
                    payload: '{"id":"evt_123"}',
                    signatureVerified: true,
                    processStatus: 'success',
                    tenantId: 't1',
                    tenantName: 'Acme Corp',
                    error: null,
                    receivedAt: '2023-01-01T00:00:00Z',
                }
            ],
            total_count: 1,
            page: 1,
            page_size: 5
        });

        renderComponent();

        // Verify row rendering
        expect(await screen.findAllByText('customer.subscription.created')).not.toHaveLength(0);
        expect(screen.getAllByText('Acme Corp')).not.toHaveLength(0);
        expect(screen.getAllByText('成功')).not.toHaveLength(0);

        // Open detail dialog
        // We'll click the mobile card instead of the eye button since it's easier to target text content without a testid
        const mobileCards = await screen.findAllByText('customer.subscription.created');
        await user.click(mobileCards[1]); // The second one is usually the mobile card or the detail view

        // Wait for the modal title
        await waitFor(() => {
            expect(screen.getAllByText('Webhook詳細')).not.toHaveLength(0);
        });

        // Verify modal contents
        expect(await screen.findByText('evt_123')).toBeInTheDocument();
        expect(screen.getAllByText('✓ 検証済み')).not.toHaveLength(0);
        expect(screen.getAllByText('{"id":"evt_123"}')).not.toHaveLength(0);
    });
});
