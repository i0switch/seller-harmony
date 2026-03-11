import { Link, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SellerSignupCheckEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-5">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <MailCheck className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">メールアドレスを確認して</h1>
            <p className="text-sm text-muted-foreground mt-2">
              登録したメールアドレスに確認メールを送ったよ。
              メール内のリンクを押して認証を完了して。
            </p>
          </div>
        </div>

        {email && (
          <div className="rounded-lg bg-muted/60 p-4 text-sm">
            <p className="text-muted-foreground">送信先</p>
            <p className="font-medium break-all">{email}</p>
          </div>
        )}

        <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground space-y-1">
          <p>メールが見つからないときはこれを確認して。</p>
          <p>・迷惑メールフォルダ</p>
          <p>・メールアドレスの入力ミス</p>
          <p>・少し待ってから再確認</p>
        </div>

        <Button asChild className="w-full">
          <Link to="/seller/login">確認しました</Link>
        </Button>
      </div>
    </div>
  );
}
