import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SellerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ai@example.com");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/seller/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm glass-card rounded-xl p-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">🎤 販売者ログイン</h1>
          <p className="text-sm text-muted-foreground mt-1">ダッシュボードにアクセス</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>パスワード</Label>
            <Input type="password" defaultValue="password" />
          </div>
          <Button type="submit" className="w-full">ログイン</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          初めてですか？ <Link to="/seller/signup" className="text-accent hover:underline">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
