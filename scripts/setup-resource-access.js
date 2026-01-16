
// @ts-check

// This script is designed to be run from the command line.
// It seeds the Firestore database with initial data for the resource center.

// IMPORTANT: This script is intended for one-time use.
// Running it multiple times will overwrite existing data.

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

// IMPORTANT: You'll need to create a .env file in the root of the project
// and add your Firebase project's configuration details there.
// See .env.example for the required variables.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDatabase() {
  console.log("Seeding initial resource access documents...");

  const resourceAccessCollection = collection(db, "resourceAccess");

  // 1. Shared Resources
  const sharedResourcesPath = "Shared Resources";
  const sharedResourcesRef = doc(resourceAccessCollection, sharedResourcesPath);
  await setDoc(sharedResourcesRef, {
    visibleTo: ["public"],
  });
  console.log(`- Set permissions for: ${sharedResourcesPath}`);

  // 2. Supervision Resources
  const supervisionResourcesPath = "Supervision Resources";
  const supervisionResourcesRef = doc(resourceAccessCollection, supervisionResourcesPath);
  await setDoc(supervisionResourcesRef, {
    visibleTo: ["allSupervision"],
  });
  console.log(`- Set permissions for: ${supervisionResourcesPath}`);

  console.log("\nInitial data seeded successfully!");
}

seedDatabase()
  .then(() => {
    // Manually exit the process to prevent it from hanging.
    // This is necessary because the Firebase connection remains active.
    process.exit(0);
  })
  .catch(error => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
