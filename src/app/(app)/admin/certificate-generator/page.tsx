'use client';

import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { RoleGate } from '@/components/auth/role-gate';
import { FileUpload } from './_components/file-upload';
import { CertificatePreview } from './_components/certificate-preview';
import { generatePDF } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserRole } from '@/providers/user-provider';

enum AppStatus {
    IDLE = 'idle',
    GENERATING_PDF = 'generating_pdf',
    SUCCESS = 'success',
    ERROR = 'error'
}

export default function CertificateGeneratorPage() {
  const [svgContent, setSvgContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // Dimensions of the original SVG, needed for PDF
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  const handleFileSelect = (content: string, name: string) => {
    setSvgContent(content);
    setFileName(name);
    setStatus(AppStatus.IDLE);
  };

  const handleDimensionsReady = useCallback((width: number, height: number) => {
    setSvgDimensions(prev => {
      // Prevent state update if dimensions haven't changed
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const handleProcess = async () => {
    if (!svgContent) return;

    try {
      setStatus(AppStatus.GENERATING_PDF);

      // 1. Prepare SVG string with replaced name
      const finalSvgContent = svgContent.replace(/{{Name}}/g, recipientName || 'Recipient Name');

      // 2. Generate PDF Blob
      const pdfBlob = await generatePDF(finalSvgContent, svgDimensions.width, svgDimensions.height);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipientName.replace(/\s+/g, '_')}_Certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus(AppStatus.IDLE);
      toast({
        title: "Success",
        description: "Certificate generated and downloaded.",
      });

    } catch (error) {
      console.error("Processing Error:", error);
      setStatus(AppStatus.ERROR);
      toast({
        title: "Error",
        description: "Failed to generate certificate.",
        variant: "destructive",
      });
    }
  };

  const isWorking = status === AppStatus.GENERATING_PDF;

  // Use the correct capitalized roles from the UserProvider definition
  const allowedRoles: UserRole[] = ['Admin', 'Trainer', 'LineManager'];

  return (
    <RoleGate allowedRoles={allowedRoles}>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Certificate Generator</h2>
                <p className="text-muted-foreground">
                    Upload an SVG template and generate PDF certificates.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left Column: Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Certificate Preview</CardTitle>
                    {fileName && <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
                </CardHeader>
                <CardContent>
                    {!svgContent ? (
                        <FileUpload onFileSelect={handleFileSelect} />
                    ) : (
                        <>
                        <CertificatePreview 
                            svgContent={svgContent} 
                            recipientName={recipientName} 
                            onDimensionsReady={handleDimensionsReady}
                        />
                        <div className="mt-4 flex justify-end">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSvgContent('')}
                                className="text-destructive hover:text-destructive/90"
                            >
                            Remove Template
                            </Button>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Default SVG helper if user has none */}
            {!svgContent && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                 <div className="mt-1 text-blue-500">
                   <AlertCircle className="w-5 h-5" />
                 </div>
                 <div className="text-sm text-blue-800">
                   <p className="font-semibold mb-1">Tip:</p>
                   <p>Upload an SVG file that contains the text <code>{`{{Name}}`}</code>. This placeholder will be replaced automatically with the recipient's name below.</p>
                 </div>
               </div>
            )}
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* 1. Recipient Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Recipient Details</CardTitle>
                    <CardDescription>Enter the details to appear on the certificate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipientName">Full Name</Label>
                        <Input 
                            id="recipientName"
                            type="text" 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="e.g. Jane Doe"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <Button
                onClick={handleProcess}
                disabled={!svgContent || !recipientName || isWorking}
                className="w-full py-6 text-lg"
            >
                {status === AppStatus.GENERATING_PDF ? (
                   <>
                       <Loader2 className="w-5 h-5 animate-spin mr-2" />
                       Generating...
                   </>
                ) : (
                   <>
                       <Download className="w-5 h-5 mr-2" />
                       Download PDF
                   </>
                )}
            </Button>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
