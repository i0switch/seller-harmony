import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">🎤 ファンクラブ運用インフラ</h1>
          <p className="text-sm text-muted-foreground mt-2">マルチテナントSaaS</p>
        </div>
        <div className="space-y-3">
          <Link
            to="/platform/login"
            className="block glass-card rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold">🛡️ Platform Admin</p>
            <p className="text-xs text-muted-foreground mt-1">SaaS管理者としてログイン</p>
          </Link>
          <Link
            to="/seller/login"
            className="block glass-card rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold">🎤 Seller / Tenant</p>
            <p className="text-xs text-muted-foreground mt-1">販売者としてログイン</p>
          </Link>
          <Link
            to="/checkout/success"
            className="block glass-card rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold">🎫 Buyer / Member</p>
            <p className="text-xs text-muted-foreground mt-1">購入者フローを確認</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
