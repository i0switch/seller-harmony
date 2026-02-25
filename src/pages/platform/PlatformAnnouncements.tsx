import { useState } from "react";
import { mockAnnouncements, announcementStatusLabel, announcementSeverityLabel, formatDateJP } from "@/lib/mockData";
import type { Announcement, AnnouncementSeverity, AnnouncementTarget, AnnouncementStatus } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";

const statusVariant: Record<AnnouncementStatus, "default" | "secondary" | "outline"> = {
  published: "default", draft: "secondary", ended: "outline",
};
const severityVariant: Record<AnnouncementSeverity, "default" | "destructive" | "secondary"> = {
  info: "secondary", warning: "default", critical: "destructive",
};

const emptyAnn: Omit<Announcement, "id" | "createdAt" | "updatedAt"> = {
  title: "", body: "", severity: "info", targetScope: "all", status: "draft",
  startsAt: "", endsAt: "", isPublished: false,
};

export default function PlatformAnnouncements() {
  const [announcements] = useState(mockAnnouncements);
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editData, setEditData] = useState<Omit<Announcement, "id" | "createdAt" | "updatedAt">>(emptyAnn);
  const [previewData, setPreviewData] = useState<Announcement | null>(null);
  const { toast } = useToast();

  const filtered = statusFilter === "all" ? announcements : announcements.filter((a) => a.status === statusFilter);

  const openCreate = () => { setEditData(emptyAnn); setEditOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditData({ title: a.title, body: a.body, severity: a.severity, targetScope: a.targetScope, status: a.status, startsAt: a.startsAt, endsAt: a.endsAt, isPublished: a.isPublished });
    setEditOpen(true);
  };

  const handleSave = () => {
    setEditOpen(false);
    toast({ title: "保存しました", description: `「${editData.title}」を保存しました` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">お知らせ管理</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新規作成</Button>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AnnouncementStatus | "all")}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="draft">下書き</SelectItem>
          <SelectItem value="published">公開中</SelectItem>
          <SelectItem value="ended">終了</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <EmptyState title="お知らせがありません" />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusVariant[a.status]}>{announcementStatusLabel[a.status]}</Badge>
                  <Badge variant={severityVariant[a.severity]}>{announcementSeverityLabel[a.severity]}</Badge>
                  <span className="text-xs text-muted-foreground">対象: {a.targetScope === "all" ? "全員" : a.targetScope === "active" ? "契約中" : a.targetScope === "trial" ? "試用中" : "指定"}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => { setPreviewData(a); setPreviewOpen(true); }}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit className="h-3 w-3" /></Button>
                </div>
              </div>
              <h3 className="font-semibold">{a.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{a.body}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {a.startsAt && <span>開始: {formatDateJP(a.startsAt)}</span>}
                {a.endsAt && <span>終了: {formatDateJP(a.endsAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editData.title ? "お知らせ編集" : "お知らせ作成"}</DialogTitle>
            <DialogDescription>テナント向けお知らせを作成・編集します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} placeholder="お知らせタイトル" />
            </div>
            <div className="space-y-2">
              <Label>本文</Label>
              <Textarea value={editData.body} onChange={(e) => setEditData({ ...editData, body: e.target.value })} rows={4} placeholder="お知らせ内容..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>重要度</Label>
                <Select value={editData.severity} onValueChange={(v) => setEditData({ ...editData, severity: v as AnnouncementSeverity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">情報</SelectItem>
                    <SelectItem value="warning">注意</SelectItem>
                    <SelectItem value="critical">重大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>対象</Label>
                <Select value={editData.targetScope} onValueChange={(v) => setEditData({ ...editData, targetScope: v as AnnouncementTarget })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全テナント</SelectItem>
                    <SelectItem value="active">契約中のみ</SelectItem>
                    <SelectItem value="trial">試用中のみ</SelectItem>
                    <SelectItem value="specific">個別指定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input type="date" value={editData.startsAt} onChange={(e) => setEditData({ ...editData, startsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>終了日</Label>
                <Input type="date" value={editData.endsAt} onChange={(e) => setEditData({ ...editData, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editData.isPublished} onCheckedChange={(v) => setEditData({ ...editData, isPublished: v })} />
              <Label>公開する</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>プレビュー</DialogTitle>
            <DialogDescription>テナントに表示されるお知らせの内容</DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={severityVariant[previewData.severity]}>{announcementSeverityLabel[previewData.severity]}</Badge>
              </div>
              <h3 className="text-lg font-bold">{previewData.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewData.body}</p>
              <div className="text-xs text-muted-foreground">
                {previewData.startsAt && <span>掲載期間: {formatDateJP(previewData.startsAt)} 〜 {previewData.endsAt ? formatDateJP(previewData.endsAt) : "未定"}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
