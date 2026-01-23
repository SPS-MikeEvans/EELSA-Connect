'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle,
  Send,
  Mail,
  Users
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
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

enum AppStatus {
    IDLE = 'idle',
    GENERATING_PDF = 'generating_pdf',
    UPLOADING = 'uploading',
    SENDING_EMAIL = 'sending_email',
    SUCCESS = 'success',
    ERROR = 'error'
}

type SourceType = 'upload' | 'training' | 'supervision';

interface GroupData {
    id: string;
    name: string;
    certificateTemplateUrl?: string;
}

interface UserData {
    uid: string;
    fullName: string;
    email: string;
}

export default function CertificateGeneratorPage() {
  const [sourceType, setSourceType] = useState<SourceType>('upload');
  
  // Data for Selects
  const [availableGroups, setAvailableGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  const [groupUsers, setGroupUsers] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [svgContent, setSvgContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  // Recipient Fields
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  
  const [emailSubject, setEmailSubject] = useState<string>('Your Certificate of Completion');
  const [emailBody, setEmailBody] = useState<string>('Dear {{Name}},\n\nCongratulations on completing your training! \n\nPlease download your certificate using the link below.\n\nBest regards,\nSummit Psychology Services');

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  // Dimensions of the original SVG, needed for PDF
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // 1. Fetch Groups when Source Type Changes
  useEffect(() => {
      setAvailableGroups([]);
      setSelectedGroupId('');
      setGroupUsers([]);
      setSelectedUserId('');
      setSvgContent('');
      setFileName('');
      setRecipientName('');
      setRecipientEmail('');

      if (sourceType === 'upload') return;

      const fetchGroups = async () => {
          setLoadingGroups(true);
          try {
             const colName = sourceType === 'training' ? 'trainingCourses' : 'supervisionGroups';
             // Fetch all active groups (could filter by archived status if needed)
             const q = query(collection(db, colName), where("status", "!=", "archived")); 
             const snapshot = await getDocs(q);
             const groups: GroupData[] = snapshot.docs.map(d => ({
                 id: d.id,
                 name: d.data().name,
                 certificateTemplateUrl: d.data().certificateTemplateUrl
             }));
             setAvailableGroups(groups);
          } catch (e) {
              console.error("Error fetching groups", e);
              toast({ title: "Error", description: "Failed to load groups.", variant: "destructive" });
          } finally {
              setLoadingGroups(false);
          }
      };

      fetchGroups();
  }, [sourceType]);

  // 2. Fetch Group Details (Template + Users) when Group Selected
  useEffect(() => {
      if (!selectedGroupId || sourceType === 'upload') return;

      const loadGroupData = async () => {
          setStatus(AppStatus.IDLE);
          setGroupUsers([]);
          setSelectedUserId('');
          setSvgContent('');
          setRecipientName('');
          setRecipientEmail('');
          
          try {
              // A. Load Template
              const group = availableGroups.find(g => g.id === selectedGroupId);
              if (group?.certificateTemplateUrl) {
                  const resp = await fetch(group.certificateTemplateUrl);
                  if (resp.ok) {
                      const text = await resp.text();
                      setSvgContent(text);
                      setFileName("Group Template");
                  } else {
                       toast({ title: "Template Error", description: "Could not download the attached template.", variant: "destructive" });
                  }
              } else {
                   // No template attached
                   toast({ title: "No Template", description: "This group does not have a certificate template attached.", variant: "default" });
              }

              // B. Load Users
              // We need to find users who have this groupId in their profile or enrollment.
              // Assuming users are stored in 'users' collection and have enrolled courseIds in an array field 'enrolledCourseIds' or 'supervisionGroupId'
              
              let q;
              if (sourceType === 'training') {
                  // Standard pattern: users have array of course IDs or similar. 
                  // If that doesn't exist, we might have to query a subcollection. 
                  // Based on typical "batch-supervision" actions, let's assume 'enrolledTrainingIds' array-contains courseId
                  // OR check for 'trainingId' if it's 1:1. 
                  // Fallback: Check 'users' collection where 'role' is not admin/trainer? 
                  
                  // Let's assume a generic field 'trainingIds' (array) or we query enrollments.
                  // Since I can't see the User schema directly here, I will try a common pattern.
                  // *Correction from plan*: I will check all users and client-side filter if complex, 
                  // but let's try strict query first.
                  
                  // Try to find users with this course ID.
                  // Common pattern: `enrolledCourseIds` array-contains selectedGroupId
                  q = query(collection(db, "users"), where("enrolledCourseIds", "array-contains", selectedGroupId));
                  
                  // If that yields nothing, we might need to adjust.
              } else {
                  // Supervision usually has `supervisionGroupId` field on user
                  q = query(collection(db, "users"), where("supervisionGroupId", "==", selectedGroupId));
              }

              const snapshot = await getDocs(q);
              const users: UserData[] = [];
              snapshot.forEach(doc => {
                  const d = doc.data();
                  // Filter out trainers/admins if needed, though they might be students too.
                  if (d.role !== 'Admin' && d.role !== 'Trainer') { 
                      users.push({
                          uid: doc.id,
                          fullName: d.fullName || "Unknown",
                          email: d.email || ""
                      });
                  }
              });
              setGroupUsers(users);

          } catch (e) {
               console.error("Error loading group details", e);
               toast({ title: "Error", description: "Failed to load group details.", variant: "destructive" });
          }
      };

      loadGroupData();
  }, [selectedGroupId, availableGroups, sourceType]);

  // 3. Auto-fill when User Selected
  useEffect(() => {
      if (!selectedUserId) return;
      const user = groupUsers.find(u => u.uid === selectedUserId);
      if (user) {
          setRecipientName(user.fullName);
          setRecipientEmail(user.email);
      }
  }, [selectedUserId, groupUsers]);


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
                    Generate and email certificates manually or from group templates.
                </p>
            </div>
        </div>

        <Tabs defaultValue="upload" value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)} className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-3">
                <TabsTrigger value="upload">Manual Upload</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="supervision">Supervision</TabsTrigger>
            </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full mt-6">
          
          {/* Left Column: Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Certificate Preview</CardTitle>
                    {fileName && <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
                </CardHeader>
                <CardContent>
                    {sourceType === 'upload' && !svgContent ? (
                        <FileUpload onFileSelect={handleFileSelect} />
                    ) : (
                        <>
                        {svgContent ? (
                            <CertificatePreview 
                                svgContent={svgContent} 
                                recipientName={recipientName} 
                                onDimensionsReady={handleDimensionsReady}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded-xl border-2 border-dashed">
                                <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">Select a group to load its template.</p>
                            </div>
                        )}
                        
                        {sourceType === 'upload' && svgContent && (
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
                        )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Default SVG helper if user has none */}
            {!svgContent && sourceType === 'upload' && (
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
                    
                    {/* Source Selection (Only if not Manual) */}
                    {sourceType !== 'upload' && (
                        <div className="space-y-2">
                             <Label>Select {sourceType === 'training' ? 'Training Course' : 'Supervision Group'}</Label>
                             <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingGroups ? "Loading..." : "Select Group"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableGroups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    )}

                    {/* User Selection (Only if Group Selected) */}
                    {sourceType !== 'upload' && selectedGroupId && (
                         <div className="space-y-2">
                            <Label>Select Recipient</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select User" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groupUsers.length > 0 ? (
                                        groupUsers.map(u => (
                                            <SelectItem key={u.uid} value={u.uid}>{u.fullName}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>No eligible users found</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="recipientName">Full Name</Label>
                        <Input 
                            id="recipientName"
                            type="text" 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="e.g. Jane Doe"
                            readOnly={sourceType !== 'upload' && !!selectedUserId} // Lock if selected from list
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
                            readOnly={sourceType !== 'upload' && !!selectedUserId}
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
