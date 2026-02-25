import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function EmptyState({ icon: Icon = Inbox, title = "データがありません", description }: EmptyStateProps) {
  return (
    <div className="glass-card rounded-xl p-10 text-center space-y-2">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
