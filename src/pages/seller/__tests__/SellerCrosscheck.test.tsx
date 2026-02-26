import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SellerCrosscheck from '../SellerCrosscheck';
import { sellerApi } from '@/services/api';
import { CrosscheckJudgment, RoleStatus } from '@/lib/mockData';
import type { CrosscheckRow } from '@/types';


vi.mock('@/services/api', () => ({
    sellerApi: {
        getCrosscheck: vi.fn(),
        runCrosscheck: vi.fn(),
    },
}));

describe('SellerCrosscheck', () => {
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
                    <SellerCrosscheck />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(sellerApi.getCrosscheck).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders success state when no issues', async () => {
        vi.mocked(sellerApi.getCrosscheck).mockResolvedValue([]);
        renderComponent();
        expect(await screen.findByText('不整合なし')).toBeInTheDocument();
    });

    it('renders issues correctly', async () => {
        const mockData = [
            {
                memberId: 'm1',
                memberName: 'John Doe',
                discordUsername: 'john#123',
                planName: 'Basic Plan',
                billingStatus: 'past_due',
                roleStatus: 'granted',
                judgment: 'needs_revoke',
                expectedState: 'No Role',
                actualState: 'Has Role',
                suggestedAction: 'Revoke Role',
                detail: 'Payment failed, role must be removed.',
                detectedAt: '2023-01-01T00:00:00Z'
            }
        ];

        vi.mocked(sellerApi.getCrosscheck).mockResolvedValue(mockData as unknown as CrosscheckRow[]);
        renderComponent();

        expect(await screen.findByText('1件')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john#123 ・ Basic Plan')).toBeInTheDocument();
        expect(screen.getByText('要剥奪')).toBeInTheDocument();
        expect(screen.getByText('支払い遅延')).toBeInTheDocument();
        expect(screen.getByText('付与済')).toBeInTheDocument();
    });

    it('calls runCrosscheck when manual check button is clicked', async () => {
        const user = userEvent.setup();
        vi.mocked(sellerApi.getCrosscheck).mockResolvedValue([]);
        vi.mocked(sellerApi.runCrosscheck).mockResolvedValue({ jobId: 'job-123' });

        renderComponent();

        const checkButton = await screen.findByText(/手動チェック実行/i);
        await user.click(checkButton);

        expect(sellerApi.runCrosscheck).toHaveBeenCalledTimes(1);
    });

    it('shows ConfirmDialog when attempting to revoke role', async () => {
        const user = userEvent.setup();
        const mockData = [
            {
                memberId: 'm1',
                memberName: 'John Doe',
                discordUsername: 'john#123',
                planName: 'Basic Plan',
                billingStatus: 'past_due',
                roleStatus: 'granted',
                judgment: 'needs_revoke',
                expectedState: 'No Role',
                actualState: 'Has Role',
                suggestedAction: 'Revoke Role',
                detail: 'Payment failed',
                detectedAt: '2023-01-01T00:00:00Z'
            }
        ];

        vi.mocked(sellerApi.getCrosscheck).mockResolvedValue(mockData as unknown as CrosscheckRow[]);
        renderComponent();

        const revokeButton = await screen.findByRole('button', { name: /剥奪/i });
        await user.click(revokeButton);

        // Alert dialog content should be visible
        expect(screen.getByText('ロールを剥奪しますか？')).toBeInTheDocument();
        expect(screen.getByText(/John Doe からDiscordロールを剥奪します。この操作は取り消せません。/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '剥奪する' })).toBeInTheDocument();
    });
});
