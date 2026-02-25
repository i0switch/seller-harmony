import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformSystemControl from '../PlatformSystemControl';
import { platformApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    platformApi: {
        getKillSwitches: vi.fn(),
        toggleKillSwitch: vi.fn(),
    },
}));

describe('PlatformSystemControl', () => {
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
                    <PlatformSystemControl />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(platformApi.getKillSwitches).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders kill switches correctly', async () => {
        vi.mocked(platformApi.getKillSwitches).mockResolvedValue([
            {
                id: 'ks1',
                name: 'Stripe Webhook',
                description: 'Pause Stripe webhooks',
                enabled: false,
                lastChangedAt: '2023-01-01T00:00:00Z',
                lastChangedBy: 'admin',
            },
            {
                id: 'ks2',
                name: 'Discord Sync',
                description: 'Pause Discord Syncs',
                enabled: true,
                lastChangedAt: '2023-01-01T00:00:00Z',
                lastChangedBy: 'admin',
            }
        ]);

        renderComponent();
        expect(await screen.findByText('Stripe Webhook')).toBeInTheDocument();
        expect(screen.getByText('Discord Sync')).toBeInTheDocument();

        // One active killswitch changes header banner
        expect(screen.getByText('1個のKill Switchが有効です')).toBeInTheDocument();
    });

    it('can toggle a kill switch via confirmation dialog', async () => {
        const user = userEvent.setup();
        vi.mocked(platformApi.getKillSwitches).mockResolvedValue([
            {
                id: 'ks1',
                name: 'Stripe Webhook',
                description: 'Pause Stripe webhooks',
                enabled: false,
                lastChangedAt: '2023-01-01T00:00:00Z',
                lastChangedBy: 'admin',
            }
        ]);
        vi.mocked(platformApi.toggleKillSwitch).mockResolvedValue({ id: 'ks1', enabled: true });

        renderComponent();

        // Wait for data
        expect(await screen.findByText('Stripe Webhook')).toBeInTheDocument();

        // Find the switch. The switch role in shadcn is usually a button with role="switch"
        const switches = screen.getAllByRole('switch');
        await user.click(switches[0]);

        // AlertDialog should appear
        expect(await screen.findByText('⚠️ 自動処理を停止しますか？')).toBeInTheDocument();

        // Click confirm
        const confirmBtn = screen.getByRole('button', { name: '停止する' });
        await user.click(confirmBtn);

        // Verify API called
        await waitFor(() => {
            expect(platformApi.toggleKillSwitch).toHaveBeenCalledWith('ks1', true);
        });
    });
});
