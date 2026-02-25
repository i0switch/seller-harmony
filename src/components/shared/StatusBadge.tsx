import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return <Badge variant={variant} className={className}>{label}</Badge>;
}
