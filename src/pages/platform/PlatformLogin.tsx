import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformAuth } from "@/hooks/useRouteGuard";

export default function PlatformLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@platform.com");
  const [password, setPassword] = useState("password");
  const { login } = usePlatformAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate("/platform/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 platform-gradient">
      <div className="w-full max-w-sm bg-card rounded-xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">🛡️ Platform Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">管理者ログイン</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">ログイン</Button>
        </form>
      </div>
    </div>
  );
}
