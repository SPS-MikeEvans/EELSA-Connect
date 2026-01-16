
"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, BookMarked, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


const journalSchema = z.object({
  title: z.string().min(3, "Title is required").max(100),
  content: z.string().min(10, "Content must be at least 10 characters long."),
});

interface JournalEntry {
    id: string;
    title: string;
    content: string;
    createdAt: any;
    updatedAt: any;
}

export default function JournalPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof journalSchema>>({
        resolver: zodResolver(journalSchema),
        defaultValues: { title: "", content: "" },
    });

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const q = query(collection(db, `users/${user.uid}/journal`), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
            setEntries(data);
            setIsLoading(false);
        }, () => setIsLoading(false));
        return () => unsubscribe();
    }, [user]);

    const handleOpenDialog = (entry: JournalEntry | null) => {
        setSelectedEntry(entry);
        form.reset(entry ? { title: entry.title, content: entry.content } : { title: "", content: "" });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof journalSchema>) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            if (selectedEntry) {
                // Update
                const entryRef = doc(db, `users/${user.uid}/journal`, selectedEntry.id);
                await updateDoc(entryRef, { ...values, updatedAt: serverTimestamp() });
                toast({ title: "Success", description: "Journal entry updated." });
            } else {
                // Create
                await addDoc(collection(db, `users/${user.uid}/journal`), {
                    ...values,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: "Success", description: "New journal entry created." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Could not save entry.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (entryId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/journal`, entryId));
            toast({ title: "Entry Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete entry.", variant: "destructive"});
        }
    }

    return (
        <RoleGate allowedRoles={['ELSA']}>
            <div className="container py-10 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Journal</h1>
                        <p className="text-muted-foreground">A private space for your reflections.</p>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)}>
                        <Plus className="mr-2 h-4 w-4" /> New Entry
                    </Button>
                </div>
                
                {isLoading ? (
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
                     </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg bg-card col-span-full">
                        <BookMarked className="mx-auto size-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Entries Yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click 'New Entry' to start your first journal reflection.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {entries.map(entry => (
                            <Card key={entry.id} className="flex flex-col">
                                <CardHeader className="flex-row items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="cursor-pointer hover:underline" onClick={() => handleOpenDialog(entry)}>{entry.title}</CardTitle>
                                        <CardDescription>{entry.createdAt ? format(entry.createdAt.toDate(), "PPP") : "Just now"}</CardDescription>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 -mr-2"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your journal entry.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardHeader>
                                <CardContent className="flex-1 cursor-pointer" onClick={() => handleOpenDialog(entry)}>
                                    <p className="line-clamp-3 text-sm text-muted-foreground">{entry.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{selectedEntry ? "Edit Entry" : "Create New Entry"}</DialogTitle>
                        <DialogDescription>Your entries are private and only visible to you.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Reflection on..." className="mt-1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="content" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Today I felt..." rows={10} className="mt-1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Entry
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </RoleGate>
    );
}
