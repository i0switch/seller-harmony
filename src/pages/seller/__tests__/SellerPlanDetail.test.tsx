import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SellerPlanDetail from '../SellerPlanDetail';
import { sellerApi } from '@/services/api';

vi.mock('@/services/api', () => ({
    sellerApi: {
        getPlans: vi.fn(),
        savePlan: vi.fn(),
        validateDiscord: vi.fn(),
    },
}));

describe('SellerPlanDetail', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
        vi.clearAllMocks();
    });

    const renderComponent = (id = 'new') => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[`/seller/plans/${id}`]}>
                    <Routes>
                        <Route path="/seller/plans/:id" element={<SellerPlanDetail />} />
                        <Route path="/seller/plans" element={<div data-testid="plans-list">Plans List</div>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('validates required fields on save', async () => {
        const user = userEvent.setup();
        renderComponent();

        // The name, price, roleId and guildId inputs must be filled
        // Just click save to trigger validation
        const saveButton = screen.getByText('作成');
        await user.click(saveButton);

        expect(await screen.findByText('プラン名を入力してください')).toBeInTheDocument();
        expect(await screen.findByText('有効な金額を入力してください')).toBeInTheDocument();
    });

    it('shows success message on valid discord check', async () => {
        const user = userEvent.setup();
        renderComponent();

        // Type into Guild and Role fields
        const guildInput = screen.getByPlaceholderText('サーバーID');
        const roleInput = screen.getByPlaceholderText('ロールID');

        await user.type(guildInput, '123456');
        await user.type(roleInput, '789012');

        vi.mocked(sellerApi.validateDiscord).mockResolvedValue({ botInstalled: true, manageRolesPermission: true, roleExists: true, botRoleHierarchy: true, errorCode: null, errorMessage: null });

        const checkButton = screen.getByText('Discord設定を検証');
        await user.click(checkButton);

        expect(await screen.findByTestId('discord-ok')).toBeInTheDocument();
        expect(sellerApi.validateDiscord).toHaveBeenCalledWith('123456', '789012');
    });

    it('shows error message on invalid discord check', async () => {
        const user = userEvent.setup();
        renderComponent();

        const guildInput = screen.getByPlaceholderText('サーバーID');
        const roleInput = screen.getByPlaceholderText('ロールID');

        await user.type(guildInput, '111');
        await user.type(roleInput, '222');

        // Simulate invalid role
        vi.mocked(sellerApi.validateDiscord).mockResolvedValue({ botInstalled: true, manageRolesPermission: false, roleExists: true, botRoleHierarchy: true, errorCode: 'permissions', errorMessage: 'Permission denied' });

        const checkButton = screen.getByText('Discord設定を検証');
        await user.click(checkButton);

        expect(await screen.findByTestId('discord-error')).toBeInTheDocument();
    });
});
