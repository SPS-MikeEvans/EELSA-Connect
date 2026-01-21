
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useUser } from "@/providers/user-provider";
import { Search, Calendar, MapPin, Users, GraduationCap, UserCircle, Filter, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { RegionAutocomplete } from "@/components/common/region-autocomplete";

interface Group {
  id: string;
  type: 'training' | 'supervision';
  name: string;
  description?: string;
  trainerName?: string; // or supervisorName
  region?: string;
  venueName?: string;
  startTime?: string;
  dates?: any;
  participantIds?: string[]; // or memberIds
  maxCapacity: number;
  status?: string;
  tags?: string[];
  createdAt?: any;
}

export default function DiscoverGroupsPage() {
  const { user, userRole, isLoading: isUserLoading } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    const fetchGroups = async () => {
        setLoading(true);
        try {
            // Fetch Training Courses
            // Note: We fetch all non-archived and filter client-side for flexibility
            // Indexes might be needed for complex compound queries, so we keep it simple for now
            const trainingQuery = query(collection(db, "trainingCourses"), orderBy("createdAt", "desc"));
            const supervisionQuery = query(collection(db, "supervisionGroups"), orderBy("createdAt", "desc"));

            const [trainingSnap, supervisionSnap] = await Promise.all([
                getDocs(trainingQuery),
                getDocs(supervisionQuery)
            ]);

            const trainingData = trainingSnap.docs.map(doc => ({
                id: doc.id,
                type: 'training' as const,
                ...doc.data()
            })) as Group[];

            const supervisionData = supervisionSnap.docs.map(doc => ({
                id: doc.id,
                type: 'supervision' as const,
                trainerName: doc.data().supervisorName, // Normalize field
                participantIds: doc.data().memberIds, // Normalize field
                ...doc.data()
            })) as Group[];

            const allGroups = [...trainingData, ...supervisionData];
            setGroups(allGroups);
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        fetchGroups();
    }
  }, [user]);

  const filteredGroups = useMemo(() => {
      return groups.filter(group => {
          // 1. Status Filter (Hide archived)
          if (group.status === 'archived') return false;

          // 2. Role Filter (Optional: Trainees might not see Supervision? Prompt says "Trainees see training groups; ELSAs see supervision groups")
          // Logic: 
          // - If userRole is 'Trainee', maybe hide 'supervision'? 
          // - If userRole is 'ELSA', maybe hide 'training'? 
          // Let's implement strict visibility based on prompt:
          // "Trainees see training groups; ELSAs see supervision groups"
          // "or both if appropriate" -> Let's show both but maybe deprioritize?
          // Actually, strict filtering is safer to avoid confusion.
          if (userRole === 'Trainee' && group.type === 'supervision') return false;
          // ELSAs might want to see Training too (refresher?), so we allow ELSAs to see both.
          
          // 3. Search Term
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            group.name.toLowerCase().includes(searchLower) || 
            group.description?.toLowerCase().includes(searchLower) ||
            group.trainerName?.toLowerCase().includes(searchLower) ||
            group.venueName?.toLowerCase().includes(searchLower) ||
            group.tags?.some(t => t.toLowerCase().includes(searchLower));
          
          if (!matchesSearch) return false;

          // 4. Region
          if (selectedRegion && selectedRegion !== 'all') {
              // Normalize comparison
              if ((group.region || "").toLowerCase() !== selectedRegion.toLowerCase()) return false;
          }

          // 5. Type
          if (selectedType !== 'all' && group.type !== selectedType) return false;

          // 6. Availability (Hide Full/Closed)
          const taken = group.participantIds?.length || 0;
          if (taken >= group.maxCapacity) return false;

          return true;
      });
  }, [groups, searchTerm, selectedRegion, selectedType, userRole]);

  if (isUserLoading || loading) {
      return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="container py-8 space-y-8">
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-headline font-bold">Discover Groups</h1>
                <p className="text-muted-foreground">Find and join open training courses and supervision groups.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-lg border">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, trainer, or topic..." 
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <RegionAutocomplete 
                        value={selectedRegion} 
                        onChange={setSelectedRegion} 
                        placeholder="Filter by Region"
                    />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full md:w-[180px] bg-white">
                        <SelectValue placeholder="Group Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="training">Training Courses</SelectItem>
                        <SelectItem value="supervision">Supervision Groups</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {filteredGroups.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-lg">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No open groups found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
                <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedRegion(""); setSelectedType("all"); }}>
                    Clear all filters
                </Button>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map(group => {
                    const taken = group.participantIds?.length || 0;
                    const spaces = group.maxCapacity - taken;
                    const startDate = group.dates?.core?.[0] ? new Date(group.dates.core[0].seconds * 1000) : (group.dates?.[0]?.seconds ? new Date(group.dates[0].seconds * 1000) : null);

                    return (
                        <Card key={group.id} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={group.type === 'training' ? "default" : "secondary"} className={group.type === 'supervision' ? "bg-purple-100 text-purple-800 hover:bg-purple-200" : ""}>
                                        {group.type === 'training' ? "Training" : "Supervision"}
                                    </Badge>
                                    {group.region && <Badge variant="outline">{group.region}</Badge>}
                                </div>
                                <CardTitle className="line-clamp-2">{group.name}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <UserCircle className="h-3 w-3" /> {group.trainerName || "TBA"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{group.venueName || "Online"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span>{startDate ? format(startDate, "PPP") : "Dates TBC"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="h-4 w-4 shrink-0" />
                                    <span className={spaces < 3 ? "text-amber-600 font-medium" : ""}>
                                        {spaces} spaces remaining
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" asChild>
                                    <Link href={group.type === 'training' ? `/trainings/${group.id}` : `/supervision-groups/${group.id}`}>
                                        View Details
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        )}
    </div>
  );
}
