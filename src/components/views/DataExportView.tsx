import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TableStats {
  name: string;
  displayName: string;
  count: number;
  loading: boolean;
}

export function DataExportView() {
  const [tables, setTables] = useState<TableStats[]>([
    { name: "tasks", displayName: "Tasks", count: 0, loading: true },
    {
      name: "task_events",
      displayName: "Task Events",
      count: 0,
      loading: true,
    },
    { name: "courses", displayName: "Courses", count: 0, loading: true },
    { name: "daily_logs", displayName: "Daily Logs", count: 0, loading: true },
    {
      name: "tasks_enriched",
      displayName: "Tasks (Enriched)",
      count: 0,
      loading: true,
    },
  ]);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTableCounts();
    const savedExportTime = localStorage.getItem("lastExportTime");
    if (savedExportTime) {
      setLastExport(savedExportTime);
    }
  }, []);

  const fetchTableCounts = async () => {
    const updatedTables = await Promise.all(
      tables.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table.name as any)
            .select("*", { count: "exact", head: true });

          if (error) throw error;

          return { ...table, count: count || 0, loading: false };
        } catch (error) {
          console.error(`Error fetching count for ${table.name}:`, error);
          return { ...table, count: 0, loading: false };
        }
      }),
    );

    setTables(updatedTables);
  };

  const convertToCSV = (data: any[], headers: string[]): string => {
    if (data.length === 0) return headers.join(",") + "\n";

    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(","));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];

        // Handle null/undefined
        if (value === null || value === undefined) return "";

        // Handle arrays (convert to JSON string)
        if (Array.isArray(value)) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }

        // Handle objects (convert to JSON string)
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }

        // Handle strings with special characters
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const exportTable = async (tableName: string, displayName: string) => {
    try {
      setExporting(tableName);

      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: `No data found in ${displayName} table`,
          variant: "destructive",
        });
        return;
      }

      // Get all unique keys from the data
      const headers = Array.from(
        new Set(data.flatMap((row) => Object.keys(row))),
      );

      const csvContent = convertToCSV(data, headers);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `${tableName}_${timestamp}.csv`;

      downloadCSV(csvContent, filename);

      // Update last export time
      const exportTime = new Date().toISOString();
      setLastExport(exportTime);
      localStorage.setItem("lastExportTime", exportTime);

      toast({
        title: "Success",
        description: `${displayName} exported successfully (${data.length} rows)`,
      });
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Failed to export ${displayName}`,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const exportAll = async () => {
    try {
      setExporting("all");

      for (const table of tables) {
        await exportTable(table.name, table.displayName);
        // Add a small delay between exports to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast({
        title: "Success",
        description: "All tables exported successfully",
      });
    } catch (error) {
      console.error("Error during export all:", error);
      toast({
        title: "Error",
        description: "Failed to export all tables",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const formatExportTime = (isoString: string) => {
    try {
      return format(new Date(isoString), "MMM d, yyyy h:mm a");
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Export</h1>
        <p className="text-muted-foreground">Download your data as CSV files</p>
      </div>

      {lastExport && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last Export</p>
                <p className="text-sm text-muted-foreground">
                  {formatExportTime(lastExport)}
                </p>
              </div>
              <Badge variant="secondary">Completed</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tables.map((table) => (
          <Card key={table.name}>
            <CardHeader>
              <CardTitle>{table.displayName}</CardTitle>
              <CardDescription>
                {table.loading ? (
                  "Loading..."
                ) : (
                  <>
                    {table.count} {table.count === 1 ? "row" : "rows"}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => exportTable(table.name, table.displayName)}
                disabled={exporting !== null || table.count === 0}
                className="w-full"
              >
                {exporting === table.name ? (
                  "Exporting..."
                ) : (
                  <>Download {table.displayName} CSV</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export All Data</CardTitle>
          <CardDescription>
            Download CSV files for all tables at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={exportAll}
            disabled={exporting !== null}
            className="w-full"
            variant="default"
          >
            {exporting === "all" ? "Exporting All..." : "Export All Tables"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • CSV files are downloaded directly to your browser's default
            download location
          </p>
          <p>• Files are timestamped with the current date and time</p>
          <p>• Complex data (arrays, objects) are exported as JSON strings</p>
          <p>• Empty tables cannot be exported</p>
          <p>• Export history is stored locally in your browser</p>
        </CardContent>
      </Card>
    </div>
  );
}
