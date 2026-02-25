import { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  sortKey?: string;
  sortAsc?: boolean;
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Render a mobile card for each item (shown on small screens) */
  renderMobileCard?: (item: T) => ReactNode;
}

export function DataTable<T>({
  columns, data, keyExtractor, sortKey, sortAsc, onSort,
  emptyTitle, emptyDescription, renderMobileCard,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle || "データがありません"} description={emptyDescription} />;
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={`${renderMobileCard ? "hidden lg:block" : ""} glass-card rounded-xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className || ""}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      className={`flex items-center gap-1 ${col.align === "right" ? "ml-auto" : ""}`}
                      onClick={() => onSort(col.key)}
                    >
                      {col.label}
                      <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? "text-foreground" : "text-muted-foreground"}`} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="border-t hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className || ""}`}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      {renderMobileCard && (
        <div className="lg:hidden space-y-3">
          {data.map((item) => (
            <div key={keyExtractor(item)}>
              {renderMobileCard(item)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
