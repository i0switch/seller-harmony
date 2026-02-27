import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformAuth } from "@/hooks/useRouteGuard";
import { useToast } from "@/hooks/use-toast";

export default function PlatformLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isLoggedIn } = usePlatformAuth();
  const { toast } = useToast();

  // If already logged in, redirect
  if (isLoggedIn) {
    navigate("/platform/dashboard", { replace: true });
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/platform/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : "メールアドレスまたはパスワードが正しくありません";
      toast({
        title: "ログイン失敗",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}
