import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SellerPlans from '../SellerPlans';
import { sellerApi } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    sellerApi: {
        getPlans: vi.fn(),
        savePlan: vi.fn(),
    },
}));

const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('SellerPlans 3-State UI', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createQueryClient();
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <SellerPlans />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading state initially', () => {
        // Return a promise that never resolves to simulate loading
        vi.mocked(sellerApi.getPlans).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        // LoadingSkeleton typically renders shimmers, might be hard to query by text.
        // Looking for an element that represents loading, or specifically the wrapper.
        // Since we can't easily query skeleton, we can check that empty/error states and plan titles are missing.
        expect(screen.queryByText('プラン管理')).toBeInTheDocument();

        // We expect no text like "プランがありません" and no errors
        expect(screen.queryByText(/プランがありません/)).not.toBeInTheDocument();
        // Assuming ErrorBanner renders something like "Error" or "エラー"
        expect(screen.queryByText(/エラー/)).not.toBeInTheDocument();
    });

    it('renders error state when API fails', async () => {
        vi.mocked(sellerApi.getPlans).mockRejectedValue(new Error('Network Error'));

        renderComponent();

        // Wait for the ErrorBanner to render
        await waitFor(() => {
            // Assuming ErrorBanner renders a generic or specific error message. Looking for a button to retry or text
            expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
        });
    });

    it('renders empty state when there are no plans', async () => {
        vi.mocked(sellerApi.getPlans).mockResolvedValue([]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('プランがありません。新規プランを作成しましょう。')).toBeInTheDocument();
        });
    });

    it('renders plans when data is returned', async () => {
        vi.mocked(sellerApi.getPlans).mockResolvedValue([
            {
                id: '1',
                name: 'Test Plan',
                description: 'Desc',
                price: 1000,
                currency: 'JPY',
                planType: 'subscription',
                status: 'published',
                discordGuildId: 'g1',
                discordRoleId: 'r1',
                discordRoleName: 'Role 1',
                memberCount: 0,
                grantPolicy: 'unlimited',
                grantDays: null,
                createdAt: new Date().toISOString(),
            }
        ]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Test Plan')).toBeInTheDocument();
        });

        // Make sure empty text and loading are gone
        expect(screen.queryByText('プランがありません。新規プランを作成しましょう。')).not.toBeInTheDocument();
    });
});
