
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  setDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Checks if a chat channel exists for a given entity ID.
 * If not, it attempts to create one via a direct call (fallback if cloud function is slow/failed).
 */
export async function ensureChatExists(entityId: string, entityType: 'training' | 'supervision', entityName: string, adminIds: string[]) {
    if (!entityId || !adminIds || adminIds.length === 0) return null;

    const chatRef = doc(db, "chats", entityId);
    
    try {
        const chatSnap = await getDoc(chatRef);

        if (chatSnap.exists()) {
            const data = chatSnap.data();
            // Self-healing: If current admin is not in memberIds, add them
            // This fixes issues where the creator wasn't added by the cloud function due to timing/email lookup
            const currentMembers = data.memberIds || [];
            const missingAdmins = adminIds.filter(id => !currentMembers.includes(id));
            
            if (missingAdmins.length > 0) {
                console.log("Self-healing: Adding missing admins to chat members", missingAdmins);
                await updateDoc(chatRef, {
                    memberIds: arrayUnion(...missingAdmins),
                    adminIds: arrayUnion(...missingAdmins)
                });
            }
            return data;
        }

        // Chat doesn't exist? Create it.
        // This is allowed for Admins and Trainers via security rules.
        await parseAndCreateChat(entityId, entityType, entityName, adminIds);
        return { id: entityId };
        
    } catch (e) {
        console.warn("Error ensuring chat exists (likely permission or network):", e);
        return null;
    }
}

async function parseAndCreateChat(id: string, type: string, name: string, admins: string[]) {
    const chatRef = doc(db, "chats", id);
    await setDoc(chatRef, {
        name: `${name} (${type === 'training' ? 'Course' : 'Supervision'} Chat)`,
        type,
        linkedEntityId: id,
        adminIds: admins,
        memberIds: admins,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp()
    });
}
