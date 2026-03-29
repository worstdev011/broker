import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  empty?: ReactNode;
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  empty,
  loading,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-d-surface border border-d-border rounded-2xl p-12 flex justify-center">
        <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0 && empty) {
    return (
      <div className="bg-d-surface border border-d-border rounded-2xl p-12 text-center text-secondary text-sm">
        {empty}
      </div>
    );
  }

  return (
    <div className="bg-d-surface border border-d-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-d-border">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-5 py-3.5 text-left text-[10px] font-semibold text-muted uppercase tracking-[0.12em] ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyFn(row)}
                className="border-b border-d-border last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-5 py-3.5 text-primary ${col.className ?? ''}`}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
