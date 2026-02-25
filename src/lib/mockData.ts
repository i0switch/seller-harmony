// Mock data for the fanclub automation SaaS

export const mockTenants = [
  {
    id: "t1",
    name: "星野アイ",
    email: "ai@example.com",
    status: "active" as const,
    stripeStatus: "verified" as const,
    discordGuild: "星野ファンクラブ",
    memberCount: 342,
    mrr: 512800,
    createdAt: "2024-11-15",
  },
  {
    id: "t2",
    name: "鈴木花子",
    email: "hanako@example.com",
    status: "active" as const,
    stripeStatus: "verified" as const,
    discordGuild: "はなちゃんねる",
    memberCount: 128,
    mrr: 127200,
    createdAt: "2025-01-03",
  },
  {
    id: "t3",
    name: "田中太郎",
    email: "taro@example.com",
    status: "onboarding" as const,
    stripeStatus: "pending" as const,
    discordGuild: "",
    memberCount: 0,
    mrr: 0,
    createdAt: "2025-02-20",
  },
];

export const mockPlans = [
  {
    id: "p1",
    name: "スタンダード会員",
    price: 980,
    interval: "month" as const,
    memberCount: 210,
    active: true,
    discordRoleId: "role_standard",
    discordRoleName: "スタンダード",
  },
  {
    id: "p2",
    name: "プレミアム会員",
    price: 2980,
    interval: "month" as const,
    memberCount: 85,
    active: true,
    discordRoleId: "role_premium",
    discordRoleName: "プレミアム",
  },
  {
    id: "p3",
    name: "VIP会員",
    price: 9800,
    interval: "month" as const,
    memberCount: 47,
    active: true,
    discordRoleId: "role_vip",
    discordRoleName: "VIP",
  },
];

export const mockMembers = [
  {
    id: "m1",
    discordUsername: "user_taro#1234",
    discordId: "123456789",
    email: "taro.buyer@example.com",
    planName: "プレミアム会員",
    status: "active" as const,
    stripeStatus: "active" as const,
    discordRoleGranted: true,
    joinedAt: "2024-12-01",
    lastPayment: "2025-02-01",
  },
  {
    id: "m2",
    discordUsername: "sakura_fan#5678",
    discordId: "987654321",
    email: "sakura@example.com",
    planName: "スタンダード会員",
    status: "active" as const,
    stripeStatus: "active" as const,
    discordRoleGranted: true,
    joinedAt: "2025-01-15",
    lastPayment: "2025-02-15",
  },
  {
    id: "m3",
    discordUsername: "ghost_user#0000",
    discordId: "111222333",
    email: "ghost@example.com",
    planName: "スタンダード会員",
    status: "inactive" as const,
    stripeStatus: "canceled" as const,
    discordRoleGranted: true,
    joinedAt: "2024-10-01",
    lastPayment: "2025-01-01",
  },
];

export const mockWebhooks = [
  {
    id: "wh1",
    event: "checkout.session.completed",
    status: "success" as const,
    tenantId: "t1",
    tenantName: "星野アイ",
    timestamp: "2025-02-25T10:23:00Z",
    payload: "{}",
  },
  {
    id: "wh2",
    event: "customer.subscription.deleted",
    status: "success" as const,
    tenantId: "t2",
    tenantName: "鈴木花子",
    timestamp: "2025-02-25T09:15:00Z",
    payload: "{}",
  },
  {
    id: "wh3",
    event: "invoice.payment_failed",
    status: "failed" as const,
    tenantId: "t1",
    tenantName: "星野アイ",
    timestamp: "2025-02-24T22:00:00Z",
    payload: "{}",
  },
];

export const mockRetryQueue = [
  {
    id: "rq1",
    event: "invoice.payment_failed",
    tenantName: "星野アイ",
    retryCount: 2,
    maxRetries: 5,
    nextRetry: "2025-02-25T12:00:00Z",
    status: "pending" as const,
  },
];

export const mockAnnouncements = [
  {
    id: "a1",
    title: "メンテナンスのお知らせ",
    body: "2025年3月1日 2:00-4:00 にシステムメンテナンスを実施します。",
    publishedAt: "2025-02-20",
    target: "all" as const,
  },
  {
    id: "a2",
    title: "新機能リリース: クロスチェック機能",
    body: "Stripe決済とDiscordロールの整合性を自動チェックする機能をリリースしました。",
    publishedAt: "2025-02-15",
    target: "seller" as const,
  },
];

export const mockCrosscheck = [
  {
    memberId: "m3",
    discordUsername: "ghost_user#0000",
    issue: "Stripe解約済みだがDiscordロール付与中",
    severity: "high" as const,
    detectedAt: "2025-02-25T08:00:00Z",
  },
];

export const mockPlatformStats = {
  totalTenants: 3,
  activeTenants: 2,
  totalMembers: 470,
  totalMRR: 640000,
  webhooksToday: 45,
  failedWebhooks: 1,
};

export const mockSellerStats = {
  totalMembers: 342,
  activePlans: 3,
  mrr: 512800,
  churnRate: 2.1,
  newMembersThisMonth: 28,
  webhooksToday: 12,
};

export const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString()}`;
