
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
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Checks if a chat channel exists for a given entity ID.
 * If not, it attempts to create one via a direct call (fallback if cloud function is slow/failed).
 * 
 * Note: Cloud functions are the primary creator. This is a client-side safety net
 * that should only be used if we are sure the user is an admin or we have a callable function.
 * 
 * For now, this just verifies existence.
 */
export async function ensureChatExists(entityId: string, entityType: 'training' | 'supervision', entityName: string, adminIds: string[]) {
    const chatRef = doc(db, "chats", entityId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        return chatSnap.data();
    }

    // Client-side creation is restricted by rules to Admins. 
    // If the current user is an Admin, they can "repair" the missing chat.
    // If not, we just return null and the UI should handle the "Chat not initialized" state.
    try {
        await parseAndCreateChat(entityId, entityType, entityName, adminIds);
        return { id: entityId };
    } catch (e) {
        console.warn("Could not create chat client-side (likely permission issue, waiting for backend):", e);
        return null;
    }
}

async function parseAndCreateChat(id: string, type: string, name: string, admins: string[]) {
    // Corrected Firestore Client SDK usage: doc() -> setDoc()
    // db.collection() is Admin SDK or legacy. Client SDK uses module imports.
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
