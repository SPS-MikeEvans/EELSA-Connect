
"use client";

import { useEffect, useState } from 'react';
import Link from "next/link";
import { collection, onSnapshot, query, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import {
  Activity,
  AlertTriangle,
  FileText,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, description, isLoading, link }: { title: string, value: string | number, icon: React.ElementType, description: string, isLoading: boolean, link?: string }) => {
    const content = (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    if (link) { return <Link href={link}>{content}</Link> }
    return content;
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        pendingApprovals: 0,
        pendingCerts: 0,
        totalUsers: 0,
        activeUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);

        const queries = {
            pendingApprovals: query(collection(db, "users"), where("approvalStatus", "==", "pending")),
            pendingCerts: query(collection(db, "users"), where("certificationStatus", "==", "pending")),
            totalUsers: collection(db, "users"),
            activeUsers: query(collection(db, "users"), where("lastSeen", ">", fiveMinutesAgo))
        };

        const unsubscribes = Object.entries(queries).map(([key, q]) => 
            onSnapshot(q, (snapshot) => {
                setStats(prev => ({ ...prev, [key]: snapshot.size }));
                setLoading(false);
            }, () => setLoading(false))
        );

        return () => unsubscribes.forEach(unsub => unsub());
    }, []);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Pending Approvals"
                value={stats.pendingApprovals}
                icon={UserCheck}
                description="New accounts needing review"
                isLoading={loading}
                link="/admin"
            />
            <StatCard
                title="Pending Certificates"
                value={stats.pendingCerts}
                icon={FileText}
                description="ELSA certificates to verify"
                isLoading={loading}
                link="/admin"
            />
            <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon={Users}
                description="All registered users"
                isLoading={loading}
                link="/admin"
            />
            <StatCard
                title="Active Now"
                value={stats.activeUsers}
                icon={Activity}
                description="Users active in last 5 mins"
                isLoading={loading}
            />
        </div>
        {/* Further admin-specific charts and tables can be added here */}
      </main>
    </div>
  );
}
