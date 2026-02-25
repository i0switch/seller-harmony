import { mockMembers } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function SellerMembers() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">会員管理</h2>
      <div className="space-y-3">
        {mockMembers.map((m) => (
          <Link
            key={m.id}
            to={`/seller/members/${m.id}`}
            className="glass-card rounded-xl p-4 flex items-center justify-between block hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-semibold">{m.discordUsername}</p>
              <p className="text-sm text-muted-foreground">{m.planName}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={m.status === "active" ? "default" : "destructive"}>
                  {m.status === "active" ? "有効" : "無効"}
                </Badge>
                {!m.discordRoleGranted && <Badge variant="outline">ロール未付与</Badge>}
                {m.status === "inactive" && m.discordRoleGranted && (
                  <Badge variant="destructive">⚠ 不整合</Badge>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>最終決済</p>
              <p>{m.lastPayment}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
