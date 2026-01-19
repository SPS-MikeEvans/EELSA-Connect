
"use client";

import { useEffect, useRef, useState } from "react";
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    doc,
    updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    createdAt: any;
}

interface ChatWindowProps {
    chatId: string;
    title?: string;
}

export function ChatWindow({ chatId, title = "Group Chat" }: ChatWindowProps) {
    const { user, userDetails } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatId || !user) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(msgs);
            setLoading(false);
            
            // Scroll to bottom on new message
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollIntoView({ behavior: "smooth" });
                }
            }, 100);
        }, (err) => {
            console.error("Chat permission error:", err);
            // Translate the raw Firebase error to a user-friendly message
            if (err.code === 'permission-denied') {
                setError("You do not have permission to view this chat. Only enrolled members can access it.");
            } else {
                setError("Unable to load chat. Please try again later.");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        try {
            // 1. Add message
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                content: newMessage,
                senderId: user.uid,
                senderName: userDetails?.fullName || user.displayName || "Unknown User",
                senderRole: userDetails?.role || "User",
                createdAt: serverTimestamp()
            });

            // 2. Update chat metadata (last activity)
            const chatRef = doc(db, "chats", chatId);
            // Fire-and-forget update (don't await strictly if not needed for UI)
            updateDoc(chatRef, {
                lastMessageAt: serverTimestamp()
            }).catch(err => console.error("Failed to update chat timestamp", err));

            setNewMessage("");
        } catch (error: any) {
            console.error("Error sending message:", error);
            if (error.code === 'permission-denied') {
                // This shouldn't happen if read passed, but just in case
                alert("You don't have permission to send messages here.");
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="flex h-[400px] items-center justify-center border rounded-lg bg-muted/5"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error) {
        return (
             <div className="flex h-[400px] flex-col items-center justify-center border rounded-lg bg-red-50 text-red-800 gap-3 p-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-600/80">If you just joined, try refreshing the page.</p>
             </div>
        );
    }

    return (
        <Card className="h-[600px] flex flex-col shadow-sm border-t-0 rounded-t-none md:border-t md:rounded-t-lg">
            <CardHeader className="py-3 border-b bg-muted/10">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    {title}
                    <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-0.5 rounded-full border shadow-sm">
                        {messages.length} messages
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative bg-slate-50/50">
                <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2 mt-20">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <Send className="h-8 w-8 text-slate-400" />
                            </div>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === user?.uid;
                                const isSameSender = index > 0 && messages[index - 1].senderId === msg.senderId;
                                
                                return (
                                    <div 
                                        key={msg.id} 
                                        className={cn(
                                            "flex w-full gap-2", 
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {!isMe && !isSameSender && (
                                            <Avatar className="h-8 w-8 mt-1 border bg-white">
                                                <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                                                    {msg.senderName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        {!isMe && isSameSender && <div className="w-8" />} {/* Spacer */}

                                        <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                            {!isSameSender && !isMe && (
                                                <span className="text-[10px] text-muted-foreground ml-1 mb-0.5 font-medium">
                                                    {msg.senderName} 
                                                    {msg.senderRole && msg.senderRole !== 'User' && ` • ${msg.senderRole}`}
                                                </span>
                                            )}
                                            
                                            <div 
                                                className={cn(
                                                    "px-4 py-2 rounded-2xl text-sm shadow-sm",
                                                    isMe 
                                                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                                        : "bg-white border rounded-tl-sm text-slate-800"
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                            
                                            <span className={cn("text-[10px] text-muted-foreground mt-1 opacity-70", isMe ? "mr-1" : "ml-1")}>
                                                {msg.createdAt?.seconds ? format(new Date(msg.createdAt.seconds * 1000), "p") : "Sending..."}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-center">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-offset-0"
                        disabled={sending}
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="h-10 w-10 shrink-0">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
