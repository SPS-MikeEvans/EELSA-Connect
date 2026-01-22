'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Download } from "lucide-react";
import { batchCreateSupervisionGroups } from '@/app/actions/batch-supervision';
import { useUser } from '@/providers/user-provider';

export function BatchAddGroupsDialog() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ successes: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // Reset previous results
    }
  };

  const downloadTemplate = () => {
    const headers = [
        "groupName",
        "region",
        "date1",
        "date2",
        "date3",
        "date4",
        "date5",
        "date6",
        "capacity",
        "format",
        "venueName",
        "address",
        "postcode",
        "description",
        "tags"
    ];
    const exampleRow = [
        "London West Cohort 1",
        "London",
        "2024-09-01T09:00:00",
        "2024-10-15T09:00:00",
        "2024-12-01T09:00:00",
        "2025-01-15T09:00:00",
        "2025-03-01T09:00:00",
        "2025-04-15T09:00:00",
        "8",
        "in-person",
        "Community Center",
        "123 Main St",
        "SW1A 1AA",
        "Focus on primary",
        "primary,ks1"
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + 
        [headers.join(","), exampleRow.join(",")].join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "supervision_groups_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
            const token = await user.getIdToken();
            const response = await batchCreateSupervisionGroups(results.data, token);
            setResult(response);
            
            if (response.successes > 0) {
                toast({
                    title: "Batch Process Completed",
                    description: `Successfully created ${response.successes} groups.`,
                });
                if (response.errors.length === 0) {
                   setTimeout(() => {
                       setIsOpen(false);
                       setFile(null);
                       setResult(null);
                   }, 3000);
                }
            } else {
                toast({
                    title: "Batch Process Failed",
                    description: "No groups were created. Please check the errors.",
                    variant: "destructive"
                });
            }

        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "An unexpected error occurred during processing.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
      },
      error: (err) => {
          setIsUploading(false);
          toast({
              title: "CSV Parsing Error",
              description: err.message,
              variant: "destructive"
          });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Batch Add Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Batch Add Supervision Groups</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple groups. <br/>
            <strong>Note:</strong> You must provide exactly 6 dates (date1...date6) for each group.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <div className="space-y-0.5">
                <Label className="text-base">CSV Template</Label>
                <p className="text-sm text-muted-foreground">Download the required format.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Upload CSV</Label>
            <div className="flex gap-2">
                <Input 
                    id="file" 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
            </div>
          </div>

          {/* Results Area */}
          {result && (
              <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4" />
                          <span>Success: {result.successes} created</span>
                      </div>
                      {result.errors.length > 0 && (
                          <div className="space-y-1">
                              <div className="flex items-center gap-2 text-destructive font-medium">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Errors ({result.errors.length})</span>
                              </div>
                              <ul className="text-sm text-muted-foreground list-disc pl-5">
                                  {result.errors.map((err, i) => (
                                      <li key={i}>{err}</li>
                                  ))}
                              </ul>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
              Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload & Process
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
