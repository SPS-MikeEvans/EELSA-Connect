
"use client";

import { useEffect, useState } from "react";
import { useUser, UserRole } from "@/providers/user-provider";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FilePlus } from "lucide-react";

interface Certificate {
  id: string;
  course: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  downloadUrl: string;
}

export default function CertificatesPage() {
  const { userRole } = useUser();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define roles that can access the generator
  const canGenerateCertificates = userRole === 'Admin' || userRole === 'Trainer' || userRole === 'LineManager';

  useEffect(() => {
    // Only fetch certificates if the user is NOT staff
    if (canGenerateCertificates) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const certsRef = collection(db, "users", user.uid, "certificates");
        const q = query(certsRef, orderBy("date", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const certsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Certificate[];
          setCertificates(certsData);
          setIsLoading(false);
        }, (error) => {
            console.error("Certificates snapshot error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
      } else {
        setIsLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, [canGenerateCertificates]);

  return (
    <div className="space-y-6">
      {/* Admin/Trainer Tool Section */}
      {canGenerateCertificates && (
        <Card className="border-indigo-100 bg-indigo-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg text-indigo-900">Certificate Tools</CardTitle>
              <CardDescription className="text-indigo-700/80">
                Generate and distribute certificates for trainees.
              </CardDescription>
            </div>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Link href="/admin/certificate-generator">
                <FilePlus className="mr-2 h-4 w-4" />
                Open Generator
              </Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* My Certificates Section - Only for Trainees/ELSAs */}
      {!canGenerateCertificates && (
        <Card>
            <CardHeader>
            <CardTitle className="font-headline">My Certificates</CardTitle>
            <CardDescription>
                Here are the certificates you have earned. Download them for your records.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[60%]">Course Name</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-28" /></TableCell>
                    </TableRow>
                    ))
                ) : certificates.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">You have not earned any certificates yet.</TableCell>
                    </TableRow>
                ) : (
                    certificates.map((cert) => (
                    <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.course}</TableCell>
                        <TableCell>{new Date(cert.date.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                        <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <a href={cert.downloadUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                            </a>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
