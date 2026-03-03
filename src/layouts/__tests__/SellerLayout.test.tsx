import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SellerLayout from '../SellerLayout';
import * as useSellerAuthModule from '@/hooks/useSellerAuth';

// Mock the hook
vi.mock('@/hooks/useSellerAuth', () => ({
    useSellerAuth: vi.fn(),
}));

describe('SellerLayout', () => {
    const renderLayout = (initialRoute = '/seller/dashboard') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path="/seller" element={<SellerLayout />}>
                        <Route path="dashboard" element={<div data-testid="dashboard-content">Dashboard</div>} />
                    </Route>
                    <Route path="/seller/login" element={<div data-testid="login-page">Login Page</div>} />
                    <Route path="/seller/onboarding/profile" element={<div data-testid="onboarding-page">Onboarding Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to login if not logged in', () => {
        vi.mocked(useSellerAuthModule.useSellerAuth).mockReturnValue({
            isLoggedIn: false,
            isOnboarded: false,
            isLoading: false,
            currentStep: 'profile',
            login: vi.fn(),
            logout: vi.fn(),
            setOnboardingStep: vi.fn(),
            completeOnboarding: vi.fn(),
            getNextStep: vi.fn(),
            canAccessStep: vi.fn(),
            signup: vi.fn(),
            refreshOnboardingStep: vi.fn(),
        });

        renderLayout();
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('redirects to onboarding if logged in but not onboarded', () => {
        vi.mocked(useSellerAuthModule.useSellerAuth).mockReturnValue({
            isLoggedIn: true,
            isOnboarded: false,
            isLoading: false,
            currentStep: 'profile',
            login: vi.fn(),
            logout: vi.fn(),
            setOnboardingStep: vi.fn(),
            completeOnboarding: vi.fn(),
            getNextStep: vi.fn(),
            canAccessStep: vi.fn(),
            signup: vi.fn(),
            refreshOnboardingStep: vi.fn(),
        });

        renderLayout();
        expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    });

    it('renders dashboard content if logged in and onboarded', () => {
        vi.mocked(useSellerAuthModule.useSellerAuth).mockReturnValue({
            isLoggedIn: true,
            isOnboarded: true,
            isLoading: false,
            currentStep: 'complete',
            login: vi.fn(),
            logout: vi.fn(),
            setOnboardingStep: vi.fn(),
            completeOnboarding: vi.fn(),
            getNextStep: vi.fn(),
            canAccessStep: vi.fn(),
            signup: vi.fn(),
            refreshOnboardingStep: vi.fn(),
        });

        renderLayout();
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
});
