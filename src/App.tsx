import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Platform Admin
import PlatformLogin from "./pages/platform/PlatformLogin";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformTenants from "./pages/platform/PlatformTenants";
import PlatformTenantDetail from "./pages/platform/PlatformTenantDetail";
import PlatformWebhooks from "./pages/platform/PlatformWebhooks";
import PlatformRetryQueue from "./pages/platform/PlatformRetryQueue";
import PlatformAnnouncements from "./pages/platform/PlatformAnnouncements";
import PlatformSystemControl from "./pages/platform/PlatformSystemControl";
import PlatformLayout from "./layouts/PlatformLayout";

// Seller
import SellerSignup from "./pages/seller/SellerSignup";
import SellerSignupCheckEmail from "./pages/seller/SellerSignupCheckEmail";
import SellerLogin from "./pages/seller/SellerLogin";
import OnboardingProfile from "./pages/seller/OnboardingProfile";
import OnboardingStripe from "./pages/seller/OnboardingStripe";
import OnboardingDiscord from "./pages/seller/OnboardingDiscord";
import OnboardingComplete from "./pages/seller/OnboardingComplete";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerPlans from "./pages/seller/SellerPlans";
import SellerPlanDetail from "./pages/seller/SellerPlanDetail";
import SellerMembers from "./pages/seller/SellerMembers";
import SellerMemberDetail from "./pages/seller/SellerMemberDetail";
import SellerCrosscheck from "./pages/seller/SellerCrosscheck";
import SellerWebhooks from "./pages/seller/SellerWebhooks";
import SellerDiscordSettings from "./pages/seller/SellerDiscordSettings";
import SellerLayout from "./layouts/SellerLayout";

// Buyer
import Purchase from "./pages/buyer/Purchase";
import CheckoutSuccess from "./pages/buyer/CheckoutSuccess";
import DiscordConfirm from "./pages/buyer/DiscordConfirm";
import DiscordResult from "./pages/buyer/DiscordResult";
import MemberMe from "./pages/buyer/MemberMe";
import BuyerLogin from "./pages/buyer/BuyerLogin";
import BuyerLayout from "./layouts/BuyerLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />

            {/* Platform Admin */}
            <Route path="/platform/login" element={<PlatformLogin />} />
            <Route path="/platform" element={<PlatformLayout />}>
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="tenants" element={<PlatformTenants />} />
              <Route path="tenants/:id" element={<PlatformTenantDetail />} />
              <Route path="webhooks" element={<PlatformWebhooks />} />
              <Route path="retry-queue" element={<PlatformRetryQueue />} />
              <Route path="announcements" element={<PlatformAnnouncements />} />
              <Route path="system-control" element={<PlatformSystemControl />} />
            </Route>

            {/* Seller - standalone pages */}
            <Route path="/seller/signup" element={<SellerSignup />} />
            <Route path="/seller/signup/check-email" element={<SellerSignupCheckEmail />} />
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/onboarding/profile" element={<OnboardingProfile />} />
            <Route path="/seller/onboarding/stripe" element={<OnboardingStripe />} />
            <Route path="/seller/onboarding/discord" element={<OnboardingDiscord />} />
            <Route path="/seller/onboarding/complete" element={<OnboardingComplete />} />

            {/* Seller - dashboard layout */}
            <Route path="/seller" element={<SellerLayout />}>
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="plans" element={<SellerPlans />} />
              <Route path="plans/new" element={<SellerPlanDetail />} />
              <Route path="plans/:id" element={<SellerPlanDetail />} />
              <Route path="members" element={<SellerMembers />} />
              <Route path="members/:id" element={<SellerMemberDetail />} />
              <Route path="crosscheck" element={<SellerCrosscheck />} />
              <Route path="webhooks" element={<SellerWebhooks />} />
              <Route path="settings/discord" element={<SellerDiscordSettings />} />
            </Route>

            {/* Buyer */}
            <Route path="/buyer/login" element={<BuyerLogin />} />
            <Route element={<BuyerLayout />}>
              <Route path="/p/:id" element={<Purchase />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/buyer/discord/confirm" element={<DiscordConfirm />} />
              <Route path="/buyer/discord/result" element={<DiscordResult />} />
              <Route path="/member/me" element={<MemberMe />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
