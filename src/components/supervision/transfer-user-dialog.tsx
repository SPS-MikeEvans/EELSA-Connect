
"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, updateDoc, runTransaction, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransferUserDialogProps {
  userId: string;
  currentGroupId: string;
  userName: string;
  onTransferComplete?: () => void;
}

const REMOVE_USER_VALUE = "__remove__";

export function TransferUserDialog({ userId, currentGroupId, userName, onTransferComplete }: TransferUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Fetch other groups
      const fetchGroups = async () => {
        const q = query(collection(db, "supervisionGroups"));
        const snap = await getDocs(q);
        const fetched = snap.docs
          .map(doc => ({ id: doc.id, name: doc.data().name }))
          .filter(g => g.id !== currentGroupId);
        setGroups(fetched);
      };
      fetchGroups();
    }
  }, [open, currentGroupId]);

  const handleAction = async () => {
    if (!targetGroupId) return;
    setLoading(true);

    if (targetGroupId === REMOVE_USER_VALUE) {
        await handleRemove();
    } else {
        await handleTransfer();
    }
    
    setLoading(false);
  };

  const handleRemove = async () => {
    try {
        await runTransaction(db, async (transaction) => {
            const groupRef = doc(db, "supervisionGroups", currentGroupId);
            const userRef = doc(db, "users", userId);

            transaction.update(groupRef, { memberIds: arrayRemove(userId) });
            transaction.update(userRef, { supervisionGroupId: null });
        });

        toast({ title: "User Removed", description: `${userName} has been removed from the group.` });
        setOpen(false);
        onTransferComplete?.();
    } catch (error) {
        console.error(error);
        toast({ title: "Removal Failed", description: "Could not remove user.", variant: "destructive" });
    }
  }

  const handleTransfer = async () => {
    try {
      await runTransaction(db, async (transaction) => {
        const sourceGroupRef = doc(db, "supervisionGroups", currentGroupId);
        const targetGroupRef = doc(db, "supervisionGroups", targetGroupId);
        const userRef = doc(db, "users", userId);

        const sourceDoc = await transaction.get(sourceGroupRef);
        const targetDoc = await transaction.get(targetGroupRef);

        if (!sourceDoc.exists() || !targetDoc.exists()) throw "Group not found";

        const sourceData = sourceDoc.data();
        const targetData = targetDoc.data();

        // Remove from source
        const newSourceMembers = (sourceData.memberIds || []).filter((id: string) => id !== userId);
        transaction.update(sourceGroupRef, { memberIds: newSourceMembers });

        // Add to target
        const newTargetMembers = [...(targetData.memberIds || []), userId];
        transaction.update(targetGroupRef, { memberIds: newTargetMembers });

        // Update User
        transaction.update(userRef, { supervisionGroupId: targetGroupId });
      });

      toast({ title: "Transfer Successful", description: `Moved ${userName} to new group.` });
      setOpen(false);
      if (onTransferComplete) onTransferComplete();
    } catch (error) {
      console.error(error);
      toast({ title: "Transfer Failed", description: "Could not move user.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">Transfer</span>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move / Remove User</DialogTitle>
          <DialogDescription>
            Move <strong>{userName}</strong> to another supervision group, or remove them entirely.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="group" className="text-right">
              Action
            </Label>
            <Select onValueChange={setTargetGroupId} value={targetGroupId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an action..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value={REMOVE_USER_VALUE} className="text-destructive">
                    --- (Remove from Group) ---
                 </SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAction} disabled={loading || !targetGroupId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
