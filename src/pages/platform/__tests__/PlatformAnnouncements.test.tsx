import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformAnnouncements from '../PlatformAnnouncements';
import { platformApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    platformApi: {
        getAnnouncements: vi.fn(),
        saveAnnouncement: vi.fn(),
    },
}));

describe('PlatformAnnouncements', () => {
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
                    <PlatformAnnouncements />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading skeleton initially', () => {
        vi.mocked(platformApi.getAnnouncements).mockReturnValue(new Promise(() => { }));
        const { container } = renderComponent();
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no announcements', async () => {
        vi.mocked(platformApi.getAnnouncements).mockResolvedValue([]);
        renderComponent();
        expect(await screen.findByText('お知らせがありません')).toBeInTheDocument();
    });

    it('renders announcements data successfully', async () => {
        vi.mocked(platformApi.getAnnouncements).mockResolvedValue([
            {
                id: 'a1',
                title: 'System Maintenance',
                body: 'We will have a maintenance window tonight.',
                severity: 'info',
                targetScope: 'all',
                status: 'published',
                startsAt: '2023-01-01T00:00:00Z',
                endsAt: '2023-01-02T00:00:00Z',
                isPublished: true,
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
            }
        ]);

        renderComponent();

        expect(await screen.findByText('System Maintenance')).toBeInTheDocument();
        expect(screen.getAllByText('We will have a maintenance window tonight.')).not.toHaveLength(0);
        expect(screen.getAllByText('情報')).not.toHaveLength(0);
    });

    it('can open create dialog and input fields', async () => {
        const user = userEvent.setup();
        vi.mocked(platformApi.getAnnouncements).mockResolvedValue([]);
        vi.mocked(platformApi.saveAnnouncement).mockResolvedValue({ id: 'a2' });

        renderComponent();
        await screen.findByText('お知らせがありません');

        // Open create dialog
        const createBtn = screen.getByRole('button', { name: /新規作成/ });
        await user.click(createBtn);

        // Wait for dialog
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('お知らせ作成')).toBeInTheDocument();

        // Fill form
        const titleInput = screen.getByPlaceholderText('お知らせタイトル');
        await user.type(titleInput, 'New Features');

        const bodyInput = screen.getByPlaceholderText('お知らせ内容...');
        await user.type(bodyInput, 'We have added new features!');

        // Click save
        const saveBtn = screen.getByRole('button', { name: '保存' });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(platformApi.saveAnnouncement).toHaveBeenCalledWith(expect.objectContaining({
                title: 'New Features',
                body: 'We have added new features!',
            }));
        });
    });
});
