import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSellerAuth } from "@/hooks/useSellerAuth";

export default function SellerSignup() {
  const navigate = useNavigate();
  const { signup } = useSellerAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "表示名を入力してください";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "有効なメールアドレスを入力してください";
    if (password.length < 8) e.password = "パスワードは8文字以上にしてください";
    if (!agreed) e.agreed = "利用規約に同意してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const res = await signup(email, password);
    if (res.error) {
      setErrors({ ...errors, form: res.error.message });
      return;
    }
    navigate("/seller/onboarding/profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm glass-card rounded-xl p-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">🎤 販売者登録</h1>
          <p className="text-sm text-muted-foreground mt-1">ファンクラブを始めましょう</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{errors.form}</p>}
          <div className="space-y-2">
            <Label>表示名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="クリエイター名" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>パスワード</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" />
            <Label htmlFor="terms" className="text-sm leading-tight">
              <span className="text-accent underline cursor-pointer">利用規約</span>および
              <span className="text-accent underline cursor-pointer">プライバシーポリシー</span>に同意します
            </Label>
          </div>
          {errors.agreed && <p className="text-xs text-destructive">{errors.agreed}</p>}
          <Button type="submit" className="w-full">アカウント作成</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          既にアカウントをお持ちですか？ <Link to="/seller/login" className="text-accent hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
