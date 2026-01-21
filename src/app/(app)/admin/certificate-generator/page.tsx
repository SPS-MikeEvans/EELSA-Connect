'use client';

import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle,
  Send,
  Mail
} from 'lucide-react';
import { RoleGate } from '@/components/auth/role-gate';
import { FileUpload } from './_components/file-upload';
import { CertificatePreview } from './_components/certificate-preview';
import { generatePDF } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserRole } from '@/providers/user-provider';
import { sendEmail } from '@/lib/mail';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

enum AppStatus {
    IDLE = 'idle',
    GENERATING_PDF = 'generating_pdf',
    UPLOADING = 'uploading',
    SENDING_EMAIL = 'sending_email',
    SUCCESS = 'success',
    ERROR = 'error'
}

export default function CertificateGeneratorPage() {
  const [svgContent, setSvgContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  
  // Email Fields
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('Your Certificate of Completion');
  const [emailBody, setEmailBody] = useState<string>('Dear {{Name}},\n\nCongratulations on completing your training! \n\nPlease download your certificate using the link below.\n\nBest regards,\nSummit Psychology Services');

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
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const generateCertificateBlob = async () => {
     // 1. Prepare SVG string with replaced name
     const finalSvgContent = svgContent.replace(/{{Name}}/g, recipientName || 'Recipient Name');

     // 2. Generate PDF Blob
     return await generatePDF(finalSvgContent, svgDimensions.width, svgDimensions.height);
  }

  const handleDownload = async () => {
    if (!svgContent) return;

    try {
      setStatus(AppStatus.GENERATING_PDF);
      
      const pdfBlob = await generateCertificateBlob();

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
      console.error("Download Error:", error);
      setStatus(AppStatus.ERROR);
      toast({
        title: "Error",
        description: "Failed to generate certificate.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!svgContent || !recipientEmail) {
        toast({
            title: "Missing Information",
            description: "Please provide a recipient email and template.",
            variant: "destructive"
        });
        return;
    }

    try {
        setStatus(AppStatus.GENERATING_PDF);
        const pdfBlob = await generateCertificateBlob();

        setStatus(AppStatus.UPLOADING);
        // Create a unique filename
        const safeName = recipientName.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = Date.now();
        // Updated path to match new storage rules
        const filePath = `generated-certificates/${safeName}_${timestamp}.pdf`;
        const storageRef = ref(storage, filePath);

        // Upload
        await uploadBytes(storageRef, pdfBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        setStatus(AppStatus.SENDING_EMAIL);

        // Construct HTML Body with Link
        const personalizedBody = emailBody.replace(/{{Name}}/g, recipientName || 'Recipient');
        const htmlContent = `
            <div style="font-family: sans-serif; color: #333;">
                <p>${personalizedBody.replace(/\n/g, '<br>')}</p>
                <div style="margin-top: 20px;">
                    <a href="${downloadUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Download Certificate
                    </a>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${downloadUrl}">${downloadUrl}</a>
                </p>
            </div>
        `;

        const success = await sendEmail({
            to: recipientEmail,
            subject: emailSubject,
            html: htmlContent,
        });

        if (success) {
            toast({
                title: "Email Sent",
                description: `Certificate sent to ${recipientEmail}`,
            });
            setStatus(AppStatus.SUCCESS);
            setTimeout(() => setStatus(AppStatus.IDLE), 2000);
        } else {
            throw new Error("Failed to queue email");
        }

    } catch (error) {
        console.error("Email Error:", error);
        setStatus(AppStatus.ERROR);
        toast({
            title: "Error",
            description: "Failed to send email. Check console for details.",
            variant: "destructive",
        });
    }
  };

  const isWorking = status !== AppStatus.IDLE && status !== AppStatus.SUCCESS && status !== AppStatus.ERROR;
  
  // Use the correct capitalized roles
  const allowedRoles: UserRole[] = ['Admin', 'Trainer', 'LineManager'];

  return (
    <RoleGate allowedRoles={allowedRoles}>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Certificate Generator</h2>
                <p className="text-muted-foreground">
                    Upload an SVG template, generate PDF certificates, and email them directly.
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
                   <p>Upload an SVG file that contains the text <code>{`{{Name}}`}</code>. This placeholder will be replaced automatically with the recipient's name.</p>
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
                    <CardDescription>Enter the details for the certificate.</CardDescription>
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
                    <div className="space-y-2">
                        <Label htmlFor="recipientEmail">Email Address</Label>
                        <Input 
                            id="recipientEmail"
                            type="email" 
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="e.g. jane@example.com"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 2. Email Composer */}
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Email Composition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                     <div className="space-y-2">
                        <Label htmlFor="emailSubject">Subject</Label>
                        <Input 
                            id="emailSubject"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Email Subject"
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="emailBody">Message</Label>
                        <Textarea 
                            id="emailBody"
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            className="min-h-[150px] resize-none"
                            placeholder="Enter your email message here..."
                        />
                         <p className="text-xs text-muted-foreground text-right">
                             <code>{`{{Name}}`}</code> will be replaced with the recipient's name.
                         </p>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={handleDownload}
                    variant="outline"
                    disabled={!svgContent || !recipientName || isWorking}
                    className="py-6"
                >
                    {status === AppStatus.GENERATING_PDF ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                    <>
                        <Download className="w-5 h-5 mr-2" />
                        Download
                    </>
                    )}
                </Button>
                
                <Button
                    onClick={handleSendEmail}
                    disabled={!svgContent || !recipientName || !recipientEmail || isWorking}
                    className="py-6"
                >
                    {status === AppStatus.GENERATING_PDF || status === AppStatus.UPLOADING || status === AppStatus.SENDING_EMAIL ? (
                        <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        {status === AppStatus.GENERATING_PDF ? 'Generating...' : 
                         status === AppStatus.UPLOADING ? 'Uploading...' : 'Sending...'}
                        </>
                    ) : (
                        <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Email
                        </>
                    )}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
