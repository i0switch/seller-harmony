import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SellerMembers from '../SellerMembers';
import { sellerApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    sellerApi: {
        getMembers: vi.fn(),
    },
}));

describe('SellerMembers', () => {
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
                    <SellerMembers />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(sellerApi.getMembers).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no members', async () => {
        vi.mocked(sellerApi.getMembers).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 5 });
        renderComponent();
        expect(await screen.findByText('会員がいません')).toBeInTheDocument();
    });

    it('renders members data', async () => {
        vi.mocked(sellerApi.getMembers).mockResolvedValue({
            items: [
                {
                    id: '1',
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    planId: 'p1',
                    planName: 'Pro Plan',
                    billingStatus: 'active',
                    discordId: '1234567890',
                    discordUsername: 'jane#123',
                    discordLinkStatus: 'linked',
                    roleStatus: 'granted',
                    joinedAt: '2023-01-01T00:00:00Z',
                    lastError: null,
                    lastPayment: '2023-01-01T00:00:00Z',
                }
            ],
            total_count: 1,
            page: 1,
            page_size: 5
        });

        renderComponent();

        expect(await screen.findAllByText('Jane Doe')).not.toHaveLength(0);
        expect(screen.getAllByText('jane@example.com')).not.toHaveLength(0);
        expect(screen.getAllByText('Pro Plan')).not.toHaveLength(0);
    });

    it('triggers API call with new filter on search', async () => {
        vi.mocked(sellerApi.getMembers).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 5 });
        const user = userEvent.setup();
        renderComponent();

        const searchInput = await screen.findByPlaceholderText('名前・メール・Discordで検索...');
        await user.type(searchInput, 'test{Enter}');

        // Verification that API was called with updated search (debounce depends on implementation, but simple filter should trigger)
        expect(sellerApi.getMembers).toHaveBeenCalledWith(expect.objectContaining({
            search: expect.stringContaining('test')
        }));
    });
});
