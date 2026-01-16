
"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@/providers/user-provider";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SendHorizonal, Search, PlusCircle, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  name: string;
  description?: string;
  pinned?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
}

const newChannelSchema = z.object({
  name: z.string().min(3, "Channel name must be at least 3 characters.").max(50, "Channel name cannot exceed 50 characters."),
});

export default function MessagesPage() {
    const { user, userDetails } = useUser();
    const { toast } = useToast();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [isLoadingChannels, setIsLoadingChannels] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [isNewChannelDialogOpen, setIsNewChannelDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof newChannelSchema>>({
        resolver: zodResolver(newChannelSchema),
        defaultValues: { name: "" },
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effect to subscribe to channels
    useEffect(() => {
      const authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsLoadingChannels(true);
          const q = query(collection(db, "channels"), orderBy("name"));
          const unsubscribe = onSnapshot(q, (querySnapshot) => {
              const channelsData = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
              })) as Channel[];
              setChannels(channelsData);
              
              if (!activeChannel && channelsData.length > 0) {
                  setActiveChannel(channelsData[0]);
              }

              setIsLoadingChannels(false);
          }, (error) => {
              setIsLoadingChannels(false);
          });
          return () => unsubscribe();
        } else {
          setIsLoadingChannels(false);
          setChannels([]);
          setMessages([]);
        }
      });
      return () => authUnsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to subscribe to messages of the active channel
    useEffect(() => {
        if (!activeChannel) {
            setMessages([]);
            return;
        };

        setIsLoadingMessages(true);
        const messagesQuery = query(collection(db, "channels", activeChannel.id, "messages"), orderBy("timestamp"));
        const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
            const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
            setMessages(messagesData);
            setIsLoadingMessages(false);
        }, (error) => {
            setIsLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [activeChannel]);

    // Effect to scroll to the bottom of messages
     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !activeChannel || !userDetails) return;

        const messageData = {
            text: newMessage,
            senderId: user.uid,
            senderName: userDetails.fullName,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, "channels", activeChannel.id, "messages"), messageData);
        setNewMessage("");
    }
    
    async function onNewChannelSubmit(values: z.infer<typeof newChannelSchema>) {
        if (!user) {
            toast({ title: "Authentication required", description: "You must be logged in to create a channel.", variant: "destructive" });
            return;
        }
        setIsCreatingChannel(true);
        try {
            await addDoc(collection(db, "channels"), {
                name: values.name,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            toast({ title: "Success", description: "Channel created successfully." });
            setIsNewChannelDialogOpen(false);
            form.reset();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create channel.", variant: "destructive" });
        } finally {
            setIsCreatingChannel(false);
        }
    }


    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="grid h-[calc(100vh-8rem)] w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            <Card className="col-span-1 flex flex-col md:h-full">
                <CardHeader className="p-4 border-b">
                     <div className="flex items-center justify-between">
                        <CardTitle className="font-headline text-2xl">Channels</CardTitle>
                        <Dialog open={isNewChannelDialogOpen} onOpenChange={setIsNewChannelDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <PlusCircle className="size-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Channel</DialogTitle>
                                    <DialogDescription>Start a new conversation topic for everyone.</DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onNewChannelSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Channel Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g., 'Upcoming Events'" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full" disabled={isCreatingChannel}>
                                            {isCreatingChannel ? "Creating..." : "Create Channel"}
                                        </Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search channels..." className="pl-8" />
                    </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="p-2">
                    {isLoadingChannels ? (
                        Array.from({ length: 4 }).map((_, i) => (
                           <Skeleton key={i} className="h-12 w-full rounded-lg my-1" />
                        ))
                    ) : (
                        channels.map((channel) => (
                            <div key={channel.id} onClick={() => setActiveChannel(channel)} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50", activeChannel?.id === channel.id && "bg-accent text-accent-foreground")}>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-medium truncate">{channel.name}</p>
                                    {channel.description && <p className={cn("text-xs truncate", activeChannel?.id === channel.id ? 'text-accent-foreground/80' : 'text-muted-foreground')}>{channel.description}</p>}
                                </div>
                            </div>
                        ))
                    )}
                    </div>
                </ScrollArea>
            </Card>

            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <Card className="flex h-full flex-col">
                    {activeChannel ? (
                        <>
                            <CardHeader className="flex flex-row items-center border-b p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://picsum.photos/seed/${activeChannel.id}/100/100`} alt={activeChannel.name} data-ai-hint="abstract" />
                                        <AvatarFallback>{activeChannel.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{activeChannel.name}</p>
                                        <p className="text-xs text-muted-foreground">A place for all ELSAs to connect</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1 p-4 bg-muted/30">
                                <div className="space-y-4">
                                {isLoadingMessages ? (
                                    <div className="text-center text-muted-foreground">Loading messages...</div>
                                ) : (
                                    messages.map((message, index) => (
                                        <div key={message.id} className={cn("flex items-start gap-3", message.senderId === user?.uid ? 'justify-end' : 'justify-start')}>
                                           {message.senderId !== user?.uid && <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${message.senderId}/100/100`} alt={message.senderName} data-ai-hint="person" /><AvatarFallback>{message.senderName?.charAt(0)}</AvatarFallback></Avatar>}
                                            <div>
                                                <div className={cn("flex items-baseline gap-2", message.senderId === user?.uid ? 'justify-end' : 'justify-start')}>
                                                     {message.senderId !== user?.uid && <p className="text-xs font-medium">{message.senderName}</p>}
                                                     <p className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</p>
                                                </div>
                                                <div className={cn("max-w-xs rounded-lg p-3 text-sm md:max-w-md mt-1", message.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-card')}>
                                                    <p>{message.text}</p>
                                                </div>
                                            </div>
                                           {message.senderId === user?.uid && <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={userDetails?.fullName || ""} data-ai-hint="person" /><AvatarFallback>{userDetails?.fullName?.charAt(0)}</AvatarFallback></Avatar>}
                                        </div>
                                    ))
                                )}
                                 <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                            <div className="border-t bg-background p-4">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <Input 
                                      placeholder={`Message #${activeChannel.name}`}
                                      className="pr-12"
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      disabled={!user}
                                    />
                                    <Button type="submit" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={!newMessage.trim()}>
                                        <SendHorizonal className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                         <div className="flex h-full flex-col items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <MessageSquare className="size-12 mx-auto" />
                                <h3 className="mt-4 text-lg font-medium">Welcome to the Forum</h3>
                                <p className="mt-1 text-sm">Select a channel to start reading and posting messages.</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
