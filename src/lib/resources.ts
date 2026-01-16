
import { db, storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ResourceMetadata {
    title: string;
    type: string;
    purpose: string;
    description: string;
    contributorId: string;
    contributorName: string;
    directoryId: string | null;
}

/**
 * Uploads a resource file to Cloud Storage and saves its metadata to Firestore.
 * @param file The file to upload.
 * @param metadata The resource metadata.
 */
export async function uploadResource(file: File, metadata: ResourceMetadata) {
  if (!file || !metadata) {
    throw new Error("File and metadata are required for upload.");
  }

  // 1. Upload the file to Cloud Storage
  const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
  const uploadResult = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  // 2. Create a document in Firestore
  const resourcesCollection = collection(db, "resources");
  await addDoc(resourcesCollection, {
    ...metadata,
    downloadUrl: downloadUrl,
    storagePath: uploadResult.ref.fullPath,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    createdAt: serverTimestamp(),
    downloadCount: 0,
    averageRating: 0,
    ratingCount: 0,
  });

  return {
    ...metadata,
    downloadUrl
  };
}
