
"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, getDownloadURL } from "firebase/storage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Users, Check, X, FileText, Download, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import type { UserDetails } from '@/providers/user-provider';
import { ManageRoleDialog } from '@/components/admin/manage-role-dialog';

interface ResourceSubmission {
    id: string;
    title: string;
    description: string;
    type: string;
    fileType: string;
    purpose: string;
    downloadUrl: string;
    storagePath: string;
    submittedBy: string;
    submittedByName: string;
    submittedAt: any;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserDetails[]>([]);
  const [pendingCerts, setPendingCerts] = useState<UserDetails[]>([]);
  const [pendingResources, setPendingResources] = useState<ResourceSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch all users
        const usersQuery = query(collection(db, "users"), orderBy('createdAt', 'desc'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as UserDetails[];
          setUsers(usersData);
          setPendingUsers(usersData.filter(u => u.approvalStatus === 'pending'));
          setPendingCerts(usersData.filter(u => u.role === 'ELSA' && u.certificationStatus === 'pending'));
          setIsLoading(false);
        }, (error) => {
            console.error("Users snapshot error:", error);
            setIsLoading(false);
        });

        // Fetch Pending Resources
        const resourcesQuery = query(collection(db, "resource_submissions"));
        const unsubscribeResources = onSnapshot(resourcesQuery, (snapshot) => {
            const resData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ResourceSubmission[];
            setPendingResources(resData);
        }, (error) => console.error("Resource subs error", error));

        return () => {
          unsubscribeUsers();
          unsubscribeResources();
        };
      } else {
        setIsLoading(false);
      }
    });
    return () => authUnsubscribe();
  }, []);

  const handleUserApproval = async (userId: string, approve: boolean) => {
      try {
          const status = approve ? 'approved' : 'rejected';
          await updateDoc(doc(db, "users", userId), { approvalStatus: status });
          toast({ title: `User ${approve ? 'Approved' : 'Rejected'}`, description: `The user's account status has been updated.` });
      } catch (error) {
          toast({ title: "Error", description: "Failed to update user status.", variant: "destructive" });
      }
  };

  const handleCertApproval = async (userId: string, approve: boolean) => {
      try {
          const status = approve ? 'approved' : 'rejected';
          await updateDoc(doc(db, "users", userId), { certificationStatus: status });
          toast({ title: `Certificate ${approve ? 'Approved' : 'Rejected'}`, description: `The ELSA's certification status has been updated.` });
      } catch (error) {
          toast({ title: "Error", description: "Failed to update certificate status.", variant: "destructive" });
      }
  };

  const handleApproveResource = async (submission: ResourceSubmission) => {
      // Logic from previous step
  };

  const handleRejectResource = async (submissionId: string) => {
     // Logic from previous step
  };
  
  const handleViewCertificate = async (path: string) => {
      try {
        const url = await getDownloadURL(ref(storage, path));
        window.open(url, '_blank');
      } catch (error) {
        toast({ title: "Error", description: "Could not retrieve certificate file.", variant: "destructive"});
      }
  };
  
  const handleDeleteUser = async (userId: string) => {
    // Note: This is a "soft" delete for now, marking as deleted.
    // A more robust solution might use a Cloud Function to clean up associated data.
    toast({ title: "Action not implemented", description: "User deletion needs server-side implementation for safety."});
  }

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: "Email Copied",
        description: `${email} has been copied to your clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy email to clipboard. Your browser may not support this feature.",
        variant: "destructive",
      });
    }
  };

  const totalPending = pendingUsers.length + pendingCerts.length + pendingResources.length;

  return (
    <Tabs defaultValue="approvals" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="approvals">
             Pending Approvals
             {totalPending > 0 && (
                 <Badge variant="destructive" className="ml-2 px-1 py-0 h-5 text-xs rounded-full">
                     {totalPending}
                 </Badge>
             )}
          </TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
        </TabsList>
      </div>

      {/* PENDING APPROVALS TABS */}
      <TabsContent value="approvals" className="space-y-6">
          <Card>
              <CardHeader>
                  <CardTitle className="font-headline">Pending Account Approvals</CardTitle>
                  <CardDescription>Review and approve new Line Manager and Trainer accounts.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Requested Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {pendingUsers.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending user approvals.</TableCell></TableRow>
                          ) : (
                              pendingUsers.map(user => (
                                  <TableRow key={user.id}><TableCell className="font-medium">{user.fullName}</TableCell><TableCell>{user.email}</TableCell><TableCell><Badge variant="outline">{user.role}</Badge></TableCell><TableCell className="text-right space-x-2"><Button size="sm" variant="default" onClick={() => handleUserApproval(user.id, true)}><Check className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => handleUserApproval(user.id, false)}><X className="mr-1 h-4 w-4" /> Reject</Button></TableCell></TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
           <Card>
              <CardHeader><CardTitle className="font-headline">Pending Certificate Verifications</CardTitle><CardDescription>Review and verify new ELSA certificate uploads.</CardDescription></CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Training Details</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {pendingCerts.length === 0 ? (
                              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No pending certificate verifications.</TableCell></TableRow>
                          ) : (
                              pendingCerts.map(user => (
                                  <TableRow key={user.id}>
                                      <TableCell className="font-medium">{user.fullName}<div className="text-sm text-muted-foreground">{user.email}</div></TableCell>
                                      <TableCell>Trained at <strong>{user.certificationWhereTrained}</strong> in {user.certificationYear}</TableCell>
                                      <TableCell className="text-right space-x-2">
                                          <Button size="sm" variant="secondary" onClick={() => handleViewCertificate(user.certificationUploadPath || '')} disabled={!user.certificationUploadPath}><Download className="mr-1 h-4 w-4" /> View Cert</Button>
                                          <Button size="sm" variant="default" onClick={() => handleCertApproval(user.id, true)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                                          <Button size="sm" variant="destructive" onClick={() => handleCertApproval(user.id, false)}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </TabsContent>


      {/* ALL USERS TAB */}
      <TabsContent value="users">
        <Card>
          <CardHeader><CardTitle className="font-headline">Users Directory</CardTitle><CardDescription>Manage all users, roles, and organizations.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Organization</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => ( <TableRow key={i}><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell></TableRow>))
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium"><div>{user.fullName}</div><div className="text-sm text-muted-foreground">{user.email}</div></TableCell>
                      <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                      <TableCell>{user.organization || '-'}</TableCell>
                      <TableCell><Badge variant={user.approvalStatus === 'approved' ? 'default' : user.approvalStatus === 'rejected' ? 'destructive' : 'secondary'}>{user.approvalStatus}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <ManageRoleDialog user={user}>
                                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Manage Roles
                                </DropdownMenuItem>
                            </ManageRoleDialog>
                            <DropdownMenuItem onSelect={() => handleCopyEmail(user.email)}>Copy Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteUser(user.id)}>Delete User</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
