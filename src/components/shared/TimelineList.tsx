import type { TimelineEvent } from "@/types";
import { timelineSourceLabel, formatDateTimeJP } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Webhook, MessageCircle, User, Settings } from "lucide-react";

const sourceIcon = {
  stripe: CreditCard,
  webhook: Webhook,
  discord: MessageCircle,
  manual: User,
  system: Settings,
};

const sourceColor = {
  stripe: "text-accent",
  webhook: "text-muted-foreground",
  discord: "text-accent",
  manual: "text-warning",
  system: "text-muted-foreground",
};

interface TimelineListProps {
  events: TimelineEvent[];
}

export function TimelineList({ events }: TimelineListProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">イベントがありません</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const Icon = sourceIcon[ev.source];
        return (
          <div key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 ${sourceColor[ev.source]}`}>
                <Icon className="h-4 w-4" />
              </div>
              {idx < events.length - 1 && <div className="w-px flex-1 bg-border min-h-[1rem]" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{timelineSourceLabel[ev.source]}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{ev.event}</span>
              </div>
              <p className="text-sm mt-1">{ev.detail}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTimeJP(ev.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
