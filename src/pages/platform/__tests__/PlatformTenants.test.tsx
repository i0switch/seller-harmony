import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformTenants from '../PlatformTenants';
import { platformApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    platformApi: {
        getTenants: vi.fn(),
    },
}));

describe('PlatformTenants', () => {
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
                    <PlatformTenants />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(platformApi.getTenants).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no tenants', async () => {
        vi.mocked(platformApi.getTenants).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 5 });
        renderComponent();
        expect(await screen.findByText('該当するテナントがありません')).toBeInTheDocument();
    });

    it('renders tenants data successfully', async () => {
        vi.mocked(platformApi.getTenants).mockResolvedValue({
            items: [
                {
                    id: 't1',
                    name: 'Acme Corp',
                    email: 'admin@acme.example.com',
                    status: 'active',
                    stripeStatus: 'enabled',
                    memberCount: 150,
                    errorCount: 2,
                    lastActiveAt: '2023-10-01T12:00:00Z',
                    createdAt: '2023-01-01T00:00:00Z',
                }
            ],
            total_count: 1,
            page: 1,
            page_size: 5
        });

        renderComponent();

        // Verify tenant name
        expect(await screen.findAllByText('Acme Corp')).not.toHaveLength(0);
        // Verify member count and errors
        expect(screen.getAllByText('150')).not.toHaveLength(0);
        expect(screen.getAllByText('契約中')).not.toHaveLength(0);
        expect(screen.getAllByText('2')).not.toHaveLength(0);
    });
});
