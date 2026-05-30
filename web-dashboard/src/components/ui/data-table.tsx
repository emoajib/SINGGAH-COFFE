import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { TableSkeleton } from "./table-skeleton"
import { CardSkeleton } from "./card-skeleton"
import { EmptyState } from "./empty-state"

interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  loadingVariant?: "table" | "card"
  emptyState?: {
    icon: LucideIcon
    title: string
    description?: string
    action?: React.ReactNode
  }
  className?: string
}

function DataTable<T>({
  columns,
  data,
  isLoading = false,
  loadingVariant = "table",
  emptyState,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    if (loadingVariant === "card") {
      return <CardSkeleton count={4} />
    }
    return <TableSkeleton rows={5} columns={columns.length} />
  }

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    )
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={cn("px-4 py-3 text-sm", col.className)}
                >
                  {col.cell
                    ? col.cell(row)
                    : col.accessorKey
                    ? (row[col.accessorKey] as React.ReactNode)
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { DataTable }
export type { Column, DataTableProps }
