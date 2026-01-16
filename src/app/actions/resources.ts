'use server'

import { revalidatePath } from 'next/cache'
import { db, storage } from '@/lib/firebase-admin' // Use admin SDK for backend operations
import { getAuth } from 'firebase-admin/auth'

export async function deleteDirectory(directoryId: string, token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decodedToken.uid).get()
    const userRole = userDoc.data()?.role

    if (userRole !== 'Admin' && userRole !== 'Trainer') {
      throw new Error('Unauthorized')
    }

    const directoryRef = db.collection('directories').doc(directoryId)
    const directorySnap = await directoryRef.get()
    if (!directorySnap.exists) {
      throw new Error('Directory not found')
    }

    const batch = db.batch()

    // 1. Delete all resources within the directory
    const resourcesQuery = db.collection('resources').where('directoryId', '==', directoryId)
    const resourcesSnap = await resourcesQuery.get()
    
    const bucket = storage.bucket();

    if (!resourcesSnap.empty) {
        for (const resourceDoc of resourcesSnap.docs) {
            const resourceData = resourceDoc.data();
            // Delete associated file from storage
            if (resourceData.storagePath) {
                try {
                    const file = bucket.file(resourceData.storagePath);
                    const [exists] = await file.exists();
                    if (exists) {
                        await file.delete();
                    }
                } catch (storageError: any) {
                    // Log error but continue
                     console.error(`Failed to delete storage object ${resourceData.storagePath}:`, storageError);
                }
            }
            batch.delete(resourceDoc.ref);
        }
    }

    // 2. Delete the directory document itself
    batch.delete(directoryRef)

    // 3. Commit the batch
    await batch.commit()

    // Revalidate the resources path to update the cache
    revalidatePath('/resources')

    return { success: true, message: 'Directory and its contents deleted successfully.' }
  } catch (error: any) {
    console.error('Error deleting directory:', error)
    return { success: false, message: error.message }
  }
}
