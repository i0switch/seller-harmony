import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MemberMe from '../MemberMe';
import { buyerApi } from '@/services/api';
import { BuyerMembership } from '@/types';

vi.mock('@/services/api', () => ({
    buyerApi: {
        getMemberships: vi.fn(),
        requestRoleGrant: vi.fn(),
    },
}));

describe('MemberMe', () => {
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
                    <MemberMe />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(buyerApi.getMemberships).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no memberships', async () => {
        vi.mocked(buyerApi.getMemberships).mockResolvedValue([]);
        renderComponent();
        expect(await screen.findByText('参加中のプランはありません')).toBeInTheDocument();
    });

    it('renders active and past plans correctly', async () => {
        const mockPlans: BuyerMembership[] = [
            {
                id: '1',
                sellerName: 'Test Seller',
                planName: 'Active Premium Plan',
                planType: 'subscription',
                price: 1000,
                currency: 'JPY',
                status: 'active',
                discordLinkStatus: 'linked',
                guildName: 'Test Guild',
                discordUsername: 'user#123',
                roleStatus: 'granted',
                roleName: 'Premium Role',
                purchasedAt: '2023-01-01T00:00:00Z',
                nextBillingDate: '2023-02-01T00:00:00Z',
                expiresAt: null,
            },
            {
                id: '2',
                sellerName: 'Test Seller',
                planName: 'Expired Basic Plan',
                planType: 'subscription',
                price: 500,
                currency: 'JPY',
                status: 'expired',
                discordLinkStatus: 'linked',
                guildName: 'Test Guild',
                discordUsername: 'user#123',
                roleStatus: 'granted',
                roleName: 'Basic Role',
                purchasedAt: '2022-01-01T00:00:00Z',
                expiresAt: '2022-12-31T00:00:00Z',
                nextBillingDate: null,
            }
        ];

        vi.mocked(buyerApi.getMemberships).mockResolvedValue(mockPlans);
        renderComponent();

        // Verify sections
        expect(await screen.findByText('参加中のプラン')).toBeInTheDocument();
        expect(await screen.findByText('過去のプラン')).toBeInTheDocument();

        // Verify plan names
        expect(screen.getByText('Active Premium Plan')).toBeInTheDocument();
        expect(screen.getByText('Expired Basic Plan')).toBeInTheDocument();
    });

    it('shows discord link warning for pending_discord status', async () => {
        const mockPlans: BuyerMembership[] = [
            {
                id: '3',
                sellerName: 'Test Seller',
                planName: 'Pending Plan',
                planType: 'subscription',
                price: 1000,
                currency: 'JPY',
                status: 'pending_discord',
                discordLinkStatus: 'not_linked',
                roleStatus: 'pending',
                roleName: '',
                guildName: '',
                discordUsername: '',
                purchasedAt: '2023-01-01T00:00:00Z',
                nextBillingDate: null,
                expiresAt: null,
            }
        ];

        vi.mocked(buyerApi.getMemberships).mockResolvedValue(mockPlans);
        renderComponent();

        expect(await screen.findByText('Discord連携をして権限を受け取ってください。')).toBeInTheDocument();
    });
});
