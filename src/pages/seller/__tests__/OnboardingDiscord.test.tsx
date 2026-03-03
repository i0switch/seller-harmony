import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OnboardingDiscord from '../OnboardingDiscord';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(),
        },
    },
}));

// Mock useSellerAuth to avoid AuthProvider dependency
vi.mock('@/hooks/useSellerAuth', () => ({
    useSellerAuth: () => ({
        isOnboarded: false,
        setOnboardingStep: vi.fn(),
    }),
}));

// Mock AuthContext to prevent "useAuth must be used within AuthProvider" error
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        session: { user: { id: 'test-user-id' } },
        user: { id: 'test-user-id' },
        role: 'seller',
        isLoading: false,
        sellerOnboardingStep: 'discord',
        setSellerOnboardingStep: vi.fn(),
        sellerLogin: vi.fn(),
        sellerSignup: vi.fn(),
        logout: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe('OnboardingDiscord Verification UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <OnboardingDiscord />
            </MemoryRouter>
        );
    };

    const fillFormAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
        const guildInput = screen.getByPlaceholderText(/例: 12345/);
        const roleInput = screen.getByPlaceholderText(/例: 98765/);
        const verifyButton = screen.getByRole('button', { name: /Discord設定を検証/ });

        await user.type(guildInput, '1234567890');
        await user.type(roleInput, '0987654321');
        await user.click(verifyButton);
    };

    it('renders success UI when verification succeeds', async () => {
        const user = userEvent.setup();
        vi.mocked(supabase.functions.invoke).mockResolvedValue({
            data: { status: 'ok' },
            error: null,
        } as never);

        renderComponent();
        await fillFormAndSubmit(user);

        await waitFor(() => {
            expect(screen.getByText('検証OK')).toBeInTheDocument();
        });

        // In success state, the warning alert should not be present
        expect(screen.queryByText(/DISCORD_ROLE_HIERARCHY_INVALID/)).not.toBeInTheDocument();
    });

    it('renders hierarchy error UI when bot role is lower than target role', async () => {
        const user = userEvent.setup();
        vi.mocked(supabase.functions.invoke).mockResolvedValue({
            data: { status: 'error' },
            error: null,
        } as never);

        renderComponent();
        await fillFormAndSubmit(user);

        await waitFor(() => {
            expect(screen.getByText('検証NG')).toBeInTheDocument();
        });

        expect(screen.getByText('DISCORD_ROLE_HIERARCHY_INVALID')).toBeInTheDocument();
        expect(screen.getByText(/Botの役職が対象ロールより下位にあります/)).toBeInTheDocument();
    });

    it('renders role not found error UI', async () => {
        const user = userEvent.setup();
        // Simulate an error thrown with "Role not found" message
        vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Role not found'));

        renderComponent();
        await fillFormAndSubmit(user);

        await waitFor(() => {
            expect(screen.getByText('検証NG')).toBeInTheDocument();
        });

        expect(screen.getByText('DISCORD_ROLE_NOT_FOUND')).toBeInTheDocument();
        expect(screen.getByText(/指定されたロールIDが見つかりません/)).toBeInTheDocument();
    });

    it('renders general access denied error UI on unknown error', async () => {
        const user = userEvent.setup();
        // Simulate a general error
        vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Unknown network error'));

        renderComponent();
        await fillFormAndSubmit(user);

        await waitFor(() => {
            expect(screen.getByText('検証NG')).toBeInTheDocument();
        });

        expect(screen.getByText('DISCORD_GUILD_ACCESS_DENIED')).toBeInTheDocument();
        expect(screen.getByText(/Botがサーバーにアクセスできません/)).toBeInTheDocument();
    });
});
