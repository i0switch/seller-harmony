import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SellerDashboard from '../SellerDashboard';
import { sellerApi } from '@/services/api';
import type { SellerDiscordSettings } from '@/services/api.types';

// Mock the API module
vi.mock('@/services/api', () => ({
    sellerApi: {
        getStats: vi.fn(),
        getAnnouncements: vi.fn(),
        getDiscordSettings: vi.fn(),
    },
}));

describe('SellerDashboard', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        vi.clearAllMocks();
    });

    const renderDashboard = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <SellerDashboard />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeletons initially', () => {
        // Return unresolved promises to keep it in loading state
        vi.mocked(sellerApi.getStats).mockReturnValue(new Promise(() => { }));
        vi.mocked(sellerApi.getAnnouncements).mockReturnValue(new Promise(() => { }));
        vi.mocked(sellerApi.getDiscordSettings).mockReturnValue(new Promise(() => { }));

        const { container } = renderDashboard();

        // Check if skeletons are rendered (assuming standard shadcn Skeleton classes)
        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders error banner when API fails', async () => {
        vi.mocked(sellerApi.getStats).mockRejectedValue(new Error('API Error'));
        vi.mocked(sellerApi.getAnnouncements).mockResolvedValue([]);
        vi.mocked(sellerApi.getDiscordSettings).mockResolvedValue({ botConnected: true } as unknown as SellerDiscordSettings);

        renderDashboard();

        // React Query unhandled error might take a tick, we use findByText
        const errorBanner = await screen.findByText(/API Error/i);
        expect(errorBanner).toBeInTheDocument();
    });

    it('renders stats and announcements on success', async () => {
        vi.mocked(sellerApi.getStats).mockResolvedValue({
            totalMembers: 123,
            mrr: 150000,
            activePlans: 3,
            churnRate: 2.5,
            newMembersThisMonth: 10,
            webhooksToday: 5,
        });
        vi.mocked(sellerApi.getAnnouncements).mockResolvedValue([
            { id: '1', title: 'Test Announcement', body: 'Test Body', severity: 'info', startsAt: '2023-01-01T00:00:00Z', endsAt: '2023-12-31T00:00:00Z' },
        ]);
        vi.mocked(sellerApi.getDiscordSettings).mockResolvedValue({
            guildId: '123',
            botConnected: true,
        } as unknown as SellerDiscordSettings);

        renderDashboard();

        // Verify stats
        expect(await screen.findByText('123')).toBeInTheDocument(); // Members
        expect(await screen.findByText('Test Announcement')).toBeInTheDocument(); // Announcement
    });
});
