import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GovernmentLead } from "@shared/schema";

const EXPORT_FIELDS = [
  { key: "institutionName", label: "Institution Name", default: true },
  { key: "institutionType", label: "Institution Type", default: true },
  { key: "department", label: "Department", default: true },
  { key: "state", label: "State", default: true },
  { key: "county", label: "County", default: true },
  { key: "phoneNumber", label: "Phone Number", default: true },
  { key: "email", label: "Email", default: true },
  { key: "website", label: "Website", default: false },
  { key: "population", label: "Population", default: false },
  { key: "annualBudget", label: "Annual Budget", default: false },
  { key: "techMaturityScore", label: "Tech Maturity Score", default: false },
  { key: "priorityScore", label: "Priority Score", default: true },
  { key: "status", label: "Status", default: true },
  { key: "painPoints", label: "Pain Points", default: false },
  { key: "notes", label: "Notes", default: false },
];

export default function ExportPage() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key)
  );
  const { toast } = useToast();

  const { data: leads } = useQuery<GovernmentLead[]>({
    queryKey: ["/api/leads"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/export", {
        format,
        fields: selectedFields,
        statusFilter: statusFilter === "all" ? null : statusFilter,
      });
      return response;
    },
    onSuccess: async (response: unknown) => {
      const typedResponse = response as { data?: string; count?: number } | null;
      const data = typedResponse?.data ?? "";
      const count = typedResponse?.count ?? 0;

      if (!data) {
        toast({
          title: "Export Warning",
          description: "Export completed but no data was returned.",
          variant: "destructive",
        });
        return;
      }

      const filename = `govleads_export_${new Date().toISOString().split("T")[0]}.${format}`;
      const blob = new Blob([data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${count} leads.`,
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const selectAllFields = () => setSelectedFields(EXPORT_FIELDS.map((f) => f.key));
  const selectDefaultFields = () =>
    setSelectedFields(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key));

  const filteredLeadsCount = leads?.filter(
    (l) => statusFilter === "all" || l.status === statusFilter
  ).length ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Export Data
        </h1>
        <p className="text-muted-foreground">
          Download leads and scripts for CRM integration
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Select Fields</CardTitle>
            <CardDescription>
              Choose which fields to include in your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFields}
                data-testid="button-select-all-fields"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectDefaultFields}
                data-testid="button-select-default-fields"
              >
                Defaults Only
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EXPORT_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border transition-colors ${
                    selectedFields.includes(field.key)
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover-elevate"
                  }`}
                >
                  <Checkbox
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                    data-testid={`checkbox-field-${field.key}`}
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Format</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
                <div className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                  <RadioGroupItem value="csv" id="format-csv" data-testid="radio-csv" />
                  <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel compatible)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-md bg-muted/50 mt-2">
                  <RadioGroupItem value="json" id="format-json" data-testid="radio-json" />
                  <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileText className="h-4 w-4" />
                    JSON
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-export-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="not_contacted">Not Contacted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed_won">Won</SelectItem>
                  <SelectItem value="closed_lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Leads to export</span>
                <span className="font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {filteredLeadsCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields selected</span>
                <span className="font-medium">{selectedFields.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending || filteredLeadsCount === 0}
                data-testid="button-export"
              >
                {exportMutation.isPending ? (
                  <>Exporting...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {filteredLeadsCount} Leads
                  </>
                )}
              </Button>
              {filteredLeadsCount === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  No leads match your filter criteria
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
