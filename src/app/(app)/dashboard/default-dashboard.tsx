
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, limit, onSnapshot, orderBy, where, getCountFromServer, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Award,
  MessageSquare,
  AlertTriangle,
  Building,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RecentActivity {
  id: string;
  userName: string;
  userAvatar: string;
  action: string;
  timestamp: any;
}

export default function DefaultDashboard() {
  const { user, userDetails } = useUser();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newResourcesCount, setNewResourcesCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Hook for user-dependent stats
  useEffect(() => {
    if (!user) return;

    setIsLoadingStats(true);
    let unsubscribeChannels = () => {};
    let unsubscribeActiveUsers = () => {};

    const thirtyDaysAgo = Timestamp.now().seconds - 30 * 24 * 60 * 60;
    const twentyFourHoursAgo = Timestamp.now().seconds - 24 * 60 * 60;
    const fiveMinutesAgo = Timestamp.now().seconds - 5 * 60;

    const setupListeners = async () => {
       const resourcesQuery = query(collection(db, "resources"), where("createdAt", ">", new Timestamp(thirtyDaysAgo, 0)));
       getCountFromServer(resourcesQuery).then(snap => setNewResourcesCount(snap.data().count)).catch(() => {});

       const channelsQuery = query(collection(db, "channels"));
       unsubscribeChannels = onSnapshot(channelsQuery, async (snapshot) => {
          const promises = snapshot.docs.map(channelDoc => {
             const messagesQuery = query(
                collection(db, "channels", channelDoc.id, "messages"),
                where("timestamp", ">", new Timestamp(twentyFourHoursAgo, 0))
             );
             return getCountFromServer(messagesQuery).then(snap => snap.data().count).catch(() => 0);
          });
          const counts = await Promise.all(promises);
          setUnreadMessagesCount(counts.reduce((acc, count) => acc + count, 0));
       }, () => {});

       const activeUsersQuery = query(collection(db, "users"), where("lastSeen", ">", new Timestamp(fiveMinutesAgo, 0)));
       unsubscribeActiveUsers = onSnapshot(activeUsersQuery, (snapshot) => {
          setActiveUsersCount(snapshot.size);
       }, () => {});
       
       setIsLoadingStats(false);
    }

    setupListeners();

    return () => {
        unsubscribeChannels();
        unsubscribeActiveUsers();
    }
  }, [user]);

  // Hook for global dashboard feeds
  useEffect(() => {
    if (!user) return;

    const activityQuery = query(collection(db, "recentActivity"), orderBy("timestamp", "desc"), limit(3));
    const unsubscribeActivities = onSnapshot(activityQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecentActivity[]);
       setIsLoading(false);
    }, () => setIsLoading(false));

    return () => {
      unsubscribeActivities();
    };
  }, [user]);

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  }

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
  }
  
  const isManager = userDetails?.role === 'LineManager' || userDetails?.additionalRoles?.includes('LineManager');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 md:gap-8">
        
        {userDetails?.approvalStatus === 'pending' && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertTriangle className="h-4 w-4 !text-amber-600" />
            <AlertTitle className="ml-2 font-bold">Account Pending Approval</AlertTitle>
            <AlertDescription className="ml-2">
              Your account is currently under review by an administrator. You will be notified once it's approved.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isManager && (
                <StatCard
                    title="My Team"
                    value={userDetails?.linkedStaffIds?.length || 0}
                    icon={Building}
                    description="staff members managed"
                    isLoading={isLoadingStats}
                    link="/manager/dashboard"
                />
            )}
          <StatCard
            title="New Resources"
            value={`+${newResourcesCount}`}
            icon={BookOpen}
            description="in the last 30 days"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Recent Messages"
            value={`+${unreadMessagesCount}`}
            icon={MessageSquare}
            description="in the last 24 hours"
            isLoading={isLoadingStats}
          />
           <StatCard
            title="Active Now"
            value={activeUsersCount}
            icon={Activity}
            description="users currently online"
            isLoading={isLoadingStats}
          />
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Welcome to Excellent ELSA Connect</CardTitle>
                <CardDescription>
                  This is your hub for resources, training, and community connection.
                </CardDescription>
              </CardHeader>
            <CardContent>
              <p>Explore the sections using the sidebar to find what you need.</p>
              <div className="mt-4 flex gap-2">
                  <Button asChild><Link href="/resources">Browse Resources</Link></Button>
                  <Button asChild variant="outline"><Link href="/trainings">Find Training</Link></Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Recent Activity</CardTitle>
              <CardDescription>
                Updates from across the community.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="grid gap-1 flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-4 w-12" />
                    </div>
                ))
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                      <AvatarImage src={activity.userAvatar} alt="Avatar" data-ai-hint="person" />
                      <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.userName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action}
                      </p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                ))
              )}
               {activities.length === 0 && !isLoading && (
                    <div className="text-center text-muted-foreground py-8">
                        No recent activity.
                    </div>
               )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
