import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Lead fields that can be mapped from CSV
const LEAD_FIELDS = [
  { key: "institutionName", label: "Institution Name", required: true },
  { key: "institutionType", label: "Institution Type", required: true },
  { key: "state", label: "State", required: true },
  { key: "county", label: "County", required: false },
  { key: "city", label: "City", required: false },
  { key: "department", label: "Department", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phoneNumber", label: "Phone Number", required: false },
  { key: "website", label: "Website", required: false },
  { key: "linkedinUrl", label: "LinkedIn URL", required: false },
  { key: "twitterHandle", label: "Twitter Handle", required: false },
  { key: "population", label: "Population", required: false },
  { key: "annualBudget", label: "Annual Budget", required: false },
  { key: "notes", label: "Notes", required: false },
];

const UNMAPPED = "__unmapped__";

type ColumnMapping = Record<string, string>;

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; error: string }>;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

interface CSVImportWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function CSVImportWizard({ onComplete, onCancel }: CSVImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse CSV file
  const handleFileUpload = useCallback((file: File) => {
    Papa.parse<string[]>(file, {
      complete: (results) => {
        if (results.data.length < 2) {
          toast({
            title: "Invalid CSV",
            description: "CSV must have a header row and at least one data row.",
            variant: "destructive",
          });
          return;
        }

        const headers = results.data[0] as string[];
        const data = results.data.slice(1).filter(row => row.some(cell => cell.trim()));

        setCsvHeaders(headers);
        setCsvData(data);

        // Auto-map columns based on similar names
        const autoMapping: ColumnMapping = {};
        headers.forEach((header, index) => {
          const headerLower = header.toLowerCase().replace(/[^a-z]/g, "");
          const match = LEAD_FIELDS.find(field => {
            const fieldLower = field.label.toLowerCase().replace(/[^a-z]/g, "");
            const keyLower = field.key.toLowerCase();
            return headerLower.includes(fieldLower) ||
                   headerLower.includes(keyLower) ||
                   fieldLower.includes(headerLower) ||
                   keyLower.includes(headerLower);
          });
          autoMapping[index.toString()] = match ? match.key : UNMAPPED;
        });
        setColumnMapping(autoMapping);
        setStep("mapping");
      },
      error: (error) => {
        toast({
          title: "Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }, [toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFileUpload(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  }, [handleFileUpload, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (leads: Record<string, unknown>[]) => {
      const batchSize = 10;
      const results: ImportResult = {
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [],
      };

      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const lead = batch[j];
          const rowNum = i + j + 2; // +2 for header row and 1-based index

          try {
            const res = await fetch("/api/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lead),
            });

            if (res.ok) {
              results.success++;
            } else {
              const error = await res.json();
              if (error.error?.includes("duplicate")) {
                results.duplicates++;
              } else {
                results.failed++;
                results.errors.push({ row: rowNum, error: error.error || "Unknown error" });
              }
            }
          } catch (err) {
            results.failed++;
            results.errors.push({ row: rowNum, error: "Network error" });
          }
        }

        setImportProgress(Math.round(((i + batchSize) / leads.length) * 100));
      }

      return results;
    },
    onSuccess: (results) => {
      setImportResult(results);
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "An error occurred during import.",
        variant: "destructive",
      });
    },
  });

  // Transform CSV rows to lead objects
  const transformData = (): Record<string, unknown>[] => {
    return csvData.map(row => {
      const lead: Record<string, unknown> = {};

      Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
        if (fieldKey !== UNMAPPED) {
          const value = row[parseInt(colIndex)]?.trim();
          if (value) {
            // Handle special fields
            if (fieldKey === "population") {
              lead[fieldKey] = parseInt(value.replace(/[^0-9]/g, "")) || null;
            } else {
              lead[fieldKey] = value;
            }
          }
        }
      });

      return lead;
    });
  };

  // Start import
  const handleStartImport = () => {
    const leads = transformData();
    setStep("importing");
    setImportProgress(0);
    importMutation.mutate(leads);
  };

  // Check if required fields are mapped
  const requiredFieldsMapped = LEAD_FIELDS
    .filter(f => f.required)
    .every(f => Object.values(columnMapping).includes(f.key));

  // Preview data with mapped columns
  const previewData = csvData.slice(0, 5).map(row => {
    const mapped: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
      if (fieldKey !== UNMAPPED) {
        mapped[fieldKey] = row[parseInt(colIndex)] || "";
      }
    });
    return mapped;
  });

  // Download sample CSV
  const handleDownloadSample = () => {
    const headers = LEAD_FIELDS.map(f => f.label);
    const sampleRow = [
      "Acme County Government",
      "county",
      "CA",
      "Los Angeles",
      "Los Angeles",
      "IT Department",
      "contact@acmecounty.gov",
      "(555) 123-4567",
      "https://acmecounty.gov",
      "",
      "@acmecounty",
      "500000",
      "$50M",
      "High priority lead",
    ];

    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Leads from CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file with lead data. We'll help you map the columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drag and drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Need a template?
              </span>
              <Button variant="link" size="sm" onClick={handleDownloadSample}>
                <Download className="h-4 w-4 mr-1" />
                Download Sample CSV
              </Button>
            </div>

            {onCancel && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to lead fields. Required fields are marked with *.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {csvHeaders.map((header, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-48 font-medium truncate" title={header}>
                    {header}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={columnMapping[index.toString()] || UNMAPPED}
                    onValueChange={(value) =>
                      setColumnMapping(prev => ({ ...prev, [index.toString()]: value }))
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>-- Skip this column --</SelectItem>
                      {LEAD_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label} {field.required && "*"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columnMapping[index.toString()] !== UNMAPPED && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>

            {!requiredFieldsMapped && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Please map all required fields: Institution Name, Institution Type, State
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setStep("preview")} disabled={!requiredFieldsMapped}>
                Preview Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>
              Review the first 5 rows before importing {csvData.length} leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {LEAD_FIELDS.filter(f =>
                      Object.values(columnMapping).includes(f.key)
                    ).map((field) => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {LEAD_FIELDS.filter(f =>
                        Object.values(columnMapping).includes(f.key)
                      ).map((field) => (
                        <TableCell key={field.key} className="max-w-[200px] truncate">
                          {row[field.key] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing 5 of {csvData.length} rows</span>
              <Badge variant="outline">{csvData.length} leads to import</Badge>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleStartImport}>
                Import {csvData.length} Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing Leads...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} />
            <p className="text-center text-muted-foreground">
              {importProgress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === "complete" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{importResult.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Errors:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {importResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onComplete}>Done</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
