import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SellerSignup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/seller/onboarding/profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm glass-card rounded-xl p-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">🎤 販売者登録</h1>
          <p className="text-sm text-muted-foreground mt-1">ファンクラブを始めましょう</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>表示名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="クリエイター名" />
          </div>
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label>パスワード</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">アカウント作成</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          既にアカウントをお持ちですか？ <Link to="/seller/login" className="text-accent hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
