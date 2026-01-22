'use server';

import { db as adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";

export interface BatchResult {
  successes: number;
  errors: string[];
}

export async function batchCreateSupervisionGroups(
    csvData: any[], 
    idToken: string
): Promise<BatchResult> {
  const result: BatchResult = { successes: 0, errors: [] };

  try {
    // 1. Verify User & Role
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const role = userData?.role;
    const additionalRoles = userData?.additionalRoles || [];

    const isAuthorized = role === 'Admin' || role === 'Trainer' || role === 'LineManager' || 
                         additionalRoles.includes('Admin') || additionalRoles.includes('Trainer');

    if (!isAuthorized) {
        return { successes: 0, errors: ["Unauthorized: You do not have permission to perform this action."] };
    }

    const creatorId = decodedToken.uid;
    const creatorName = userData?.fullName || "Unknown Supervisor";

    // 2. Process Rows
    const batch = adminDb.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 450; 

    for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNum = i + 1;

        // Basic Validation
        if (!row.groupName || !row.region || !row.capacity) {
            result.errors.push(`Row ${rowNum}: Missing required fields (groupName, region, capacity).`);
            continue;
        }

        // Parse 6 Dates
        const dates: Timestamp[] = [];
        let dateError = false;
        
        for (let j = 1; j <= 6; j++) {
            const dateStr = row[`date${j}`];
            if (!dateStr) {
                 result.errors.push(`Row ${rowNum}: Missing date${j}.`);
                 dateError = true;
                 break;
            }
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) throw new Error("Invalid Date");
                dates.push(Timestamp.fromDate(date));
            } catch (e) {
                result.errors.push(`Row ${rowNum}: Invalid format for date${j} (ISO expected).`);
                dateError = true;
                break;
            }
        }

        if (dateError) continue;

        // Parse Capacity
        const capacity = parseInt(row.capacity);
        if (isNaN(capacity)) {
            result.errors.push(`Row ${rowNum}: Capacity must be a number.`);
            continue;
        }

        // Create Doc Data
        const docRef = adminDb.collection("supervisionGroups").doc();
        
        // Derive start time from the first date
        const startTimeStr = dates[0].toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const newGroup = {
            name: row.groupName,
            region: row.region, 
            startTime: startTimeStr, 
            
            supervisorName: creatorName, 
            supervisorId: creatorId,
            
            venueName: row.venueName || "TBD",
            venueAddress: row.address || "",
            postcode: row.postcode || "",
            
            maxCapacity: capacity,
            description: row.description || "",
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
            format: row.format || "in-person",
            
            dates: dates, // The array of 6 timestamps
            
            memberIds: [],
            createdAt: Timestamp.now(),
            creatorId: creatorId,
            status: 'open'
        };

        batch.set(docRef, newGroup);
        batchCount++;
        result.successes++;

        if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            batchCount = 0; 
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

  } catch (error: any) {
    console.error("Batch Create Error:", error);
    return { successes: 0, errors: [`System Error: ${error.message}`] };
  }

  return result;
}
