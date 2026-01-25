"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Feedback {
  id: string;
  type: "Bug" | "Suggestion";
  description: string;
  pageUrl: string;
  userId: string;
  userEmail?: string;
  status: "New" | "In Progress" | "Resolved" | "Rejected";
  timestamp: any;
  screenshotUrl?: string;
  notes?: string;
}

export default function FeedbackAdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGlobalEnabled, setIsGlobalEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { toast } = useToast();

  // Load Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsGlobalEnabled(docSnap.data().bugReportingEnabled || false);
        } else {
             // Create if not exists
             await setDoc(docRef, { bugReportingEnabled: false }, { merge: true });
             setIsGlobalEnabled(false);
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    };
    fetchSettings();
  }, []);

  // Real-time Feedback Listener
  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Feedback[];
      setFeedbacks(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleGlobalSetting = async (enabled: boolean) => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        bugReportingEnabled: enabled,
      }, { merge: true });
      setIsGlobalEnabled(enabled);
      toast({
        title: enabled ? "Bug Reporting Enabled" : "Bug Reporting Disabled",
        description: "This change will apply to all users immediately.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "feedback", id), {
        status: newStatus,
      });
      toast({ title: "Status updated" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const updateNotes = async (id: string, notes: string) => {
     // This could be debounced or saved on blur/button click.
     // For simplicity, we'll assume there is a Save button in a dialog or cell.
     // Implementing a simple save mechanism here.
     try {
         await updateDoc(doc(db, "feedback", id), { notes });
         toast({ title: "Notes saved" });
     } catch(e) {
         toast({ title: "Failed to save notes", variant: "destructive" });
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feedback & Bug Reports</h1>
        <div className="flex items-center space-x-2">
            <Switch
                id="feedback-toggle"
                checked={isGlobalEnabled}
                onCheckedChange={toggleGlobalSetting}
                disabled={savingSettings}
            />
            <Label htmlFor="feedback-toggle">Enable Feedback Widget</Label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            Manage user submitted bugs and suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            No feedback yet.
                        </TableCell>
                     </TableRow>
                )}
                {feedbacks.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Select
                        defaultValue={item.status}
                        onValueChange={(val) => updateStatus(item.id, val)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.type === "Bug" ? "destructive" : "default"}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="line-clamp-2" title={item.description}>
                        {item.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {item.pageUrl}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.userEmail || "Anonymous"}</span>
                        <span className="text-xs text-muted-foreground">{item.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.timestamp?.seconds
                        ? format(new Date(item.timestamp.seconds * 1000), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">View Details</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Feedback Details</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="font-semibold text-right">Type:</div>
                                        <div className="col-span-3">{item.type}</div>
                                        
                                        <div className="font-semibold text-right">Status:</div>
                                        <div className="col-span-3">{item.status}</div>

                                        <div className="font-semibold text-right">User:</div>
                                        <div className="col-span-3">{item.userEmail} ({item.userId})</div>
                                        
                                        <div className="font-semibold text-right">Page:</div>
                                        <div className="col-span-3 break-all">
                                            <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                                {item.pageUrl} <ExternalLink className="h-3 w-3 ml-1"/>
                                            </a>
                                        </div>

                                        <div className="font-semibold text-right">Description:</div>
                                        <div className="col-span-3 whitespace-pre-wrap bg-muted p-2 rounded-md">{item.description}</div>

                                        {item.screenshotUrl && (
                                            <>
                                                <div className="font-semibold text-right">Screenshot:</div>
                                                <div className="col-span-3">
                                                    <a href={item.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                                        <img src={item.screenshotUrl} alt="Screenshot" className="max-w-full max-h-[300px] rounded-md border" />
                                                    </a>
                                                </div>
                                            </>
                                        )}
                                        
                                        <div className="font-semibold text-right">Admin Notes:</div>
                                        <div className="col-span-3">
                                            <NotesEditor id={item.id} initialNotes={item.notes || ""} onSave={updateNotes} />
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotesEditor({ id, initialNotes, onSave }: { id: string, initialNotes: string, onSave: (id: string, notes: string) => void }) {
    const [notes, setNotes] = useState(initialNotes);
    return (
        <div className="flex gap-2">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes..." />
            <Button size="icon" variant="outline" onClick={() => onSave(id, notes)}>
                <Save className="h-4 w-4" />
            </Button>
        </div>
    )
}
