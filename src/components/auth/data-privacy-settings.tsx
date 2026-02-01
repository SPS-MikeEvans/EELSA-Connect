
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export function DataPrivacySettings() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      const downloadDataFunction = httpsCallable(functions, 'downloadUserData');
      const result = await downloadDataFunction();
      const data = result.data as any;

      // Create a blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Ready",
        description: "Your data has been downloaded.",
      });
    } catch (error) {
      console.error("Error downloading data:", error);
      toast({
        title: "Download Failed",
        description: "Could not retrieve your data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
        // Re-authentication would ideally happen here for security
        // For simplicity in this prototype, we'll proceed directly to the function call
        // which should verify the auth context.
        
        const deleteAccountFunction = httpsCallable(functions, 'deleteUserAccount');
        await deleteAccountFunction();

        // Sign out client-side
        await auth.signOut();
        
        // Redirect will happen automatically via auth state listener in layout
        
    } catch (error) {
        console.error("Error deleting account:", error);
        toast({
            title: "Deletion Failed",
            description: "Could not delete your account. Please contact support.",
            variant: "destructive",
        });
        setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-100 dark:border-red-900/50">
      <CardHeader>
        <CardTitle>Data & Privacy</CardTitle>
        <CardDescription>
          Manage your personal data and account existence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">Download Your Data</h3>
            <p className="text-sm text-muted-foreground">
              Get a copy of all your personal data stored on our platform.
            </p>
          </div>
          <Button variant="outline" onClick={handleDownloadData} disabled={isDownloading}>
            {isDownloading ? "Preparing..." : <><Download className="mr-2 h-4 w-4" /> Download JSON</>}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg">
          <div>
            <h3 className="font-medium text-red-700 dark:text-red-400">Delete Account</h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Delete Account Permanently?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account, remove your data from our servers, and unsubscribe you
                  from all communications.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
