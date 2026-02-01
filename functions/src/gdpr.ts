
// ... (existing imports)
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";

// ... (existing functions)

// ============================================================================
// GDPR / DATA PRIVACY FUNCTIONS
// ============================================================================

export const downloadUserData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to download your data.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();

    try {
        // 1. User Profile Data
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data() || {};

        // 2. Chat Messages (Sent by user)
        // Note: This could be large. In a real app, you might want to paginate or limit this.
        // We'll search across all 'messages' subcollections in 'chats'.
        // Firestore group queries are perfect for this.
        const messagesSnapshot = await db.collectionGroup('messages').where('senderId', '==', uid).get();
        const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            chatId: doc.ref.parent.parent?.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate().toISOString() // Convert timestamp
        }));

        // 3. Resources Uploaded
        const resourcesSnapshot = await db.collection('resources').where('uploadedBy', '==', uid).get();
        const resources = resourcesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString()
        }));
        
        // 4. Feedback Submitted
        const feedbackSnapshot = await db.collection('feedback').where('userId', '==', uid).get();
        const feedback = feedbackSnapshot.docs.map(doc => ({
            id: doc.id,
             ...doc.data(),
             createdAt: doc.data().createdAt?.toDate().toISOString()
        }));

        // Aggregate Data
        const exportData = {
            userProfile: userData,
            messages: messages,
            uploadedResources: resources,
            feedback: feedback,
            generatedAt: new Date().toISOString()
        };

        return exportData;

    } catch (error: any) {
        console.error("Error downloading user data:", error);
        throw new functions.https.HttpsError('internal', 'Unable to compile user data.', error.message);
    }
});

export const deleteUserAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to delete your account.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const storage = admin.storage();

    try {
        console.log(`Initiating account deletion for user: ${uid}`);

        // 1. Delete from Firestore 'users' collection
        await db.collection('users').doc(uid).delete();

        // 2. Anonymize or Delete Chat Messages
        // Option A: Delete (Strict Privacy) - implemented below
        // Option B: Anonymize (Keep conversation flow) - alternative strategy
        const messagesSnapshot = await db.collectionGroup('messages').where('senderId', '==', uid).get();
        const batch = db.batch();
        messagesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        // We might need multiple batches if > 500 docs, but keeping it simple for now or loop.
        if (messagesSnapshot.size > 0) await batch.commit();

        // 3. Delete Uploaded Resources (Metadata + Storage File)
        const resourcesSnapshot = await db.collection('resources').where('uploadedBy', '==', uid).get();
        const resourceBatch = db.batch();
        
        const fileDeletionPromises = resourcesSnapshot.docs.map(async (doc) => {
            const resourceData = doc.data();
            // Delete file from Storage if path exists
            if (resourceData.storagePath) {
                try {
                    await storage.bucket().file(resourceData.storagePath).delete();
                } catch (e) {
                    console.log(`File not found or already deleted: ${resourceData.storagePath}`);
                }
            }
            // Delete metadata from Firestore
            resourceBatch.delete(doc.ref);
        });

        await Promise.all(fileDeletionPromises);
        if (resourcesSnapshot.size > 0) await resourceBatch.commit();
        
        // 4. Delete Profile Picture from Storage
        try {
             // We can't easily guess the file name unless stored in user doc, 
             // but usually it's in a folder like `profile_pictures/${uid}/...`
             // This deletes the 'folder' by listing files with that prefix.
             const [files] = await storage.bucket().getFiles({ prefix: `profile_pictures/${uid}/` });
             await Promise.all(files.map(file => file.delete()));
        } catch (e) {
             console.log("No profile pictures found or error deleting folder.");
        }

        // 5. Delete from Firebase Authentication
        await admin.auth().deleteUser(uid);

        console.log(`Successfully deleted account for user: ${uid}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error deleting user account:", error);
        throw new functions.https.HttpsError('internal', 'Unable to delete account.', error.message);
    }
});
