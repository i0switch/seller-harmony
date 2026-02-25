import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerAuth } from "@/hooks/useSellerAuth";

export default function SellerLogin() {
  const navigate = useNavigate();
  const { login } = useSellerAuth();
  const [email, setEmail] = useState("ai@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    const res = await login(email, password);
    if (res.error) {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      return;
    }
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
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>パスワード</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
