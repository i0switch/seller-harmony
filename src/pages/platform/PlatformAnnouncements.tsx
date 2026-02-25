import { mockAnnouncements } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PlatformAnnouncements() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">お知らせ管理</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />新規作成</Button>
      </div>
      <div className="space-y-3">
        {mockAnnouncements.map((a) => (
          <div key={a.id} className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{a.title}</p>
              <Badge variant="outline">{a.target === "all" ? "全員" : "販売者のみ"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{a.body}</p>
            <p className="text-xs text-muted-foreground">{a.publishedAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
