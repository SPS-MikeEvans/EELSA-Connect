
// @ts-check

// This script is designed to be run from the command line using ts-node.
// It seeds the Firestore database with initial data for the resource center.

// IMPORTANT: This script is intended for one-time use.
// Running it multiple times will overwrite existing data.

import * as admin from 'firebase-admin';

// IMPORTANT: You'll need to create a .env file in the root of the project
// and add your Firebase project's configuration details there.
// See .env.example for the required variables.

// Also, you will need to create a service account in the Firebase console and
// download the JSON key file. The path to this file should be stored in the
// GOOGLE_APPLICATION_CREDENTIALS environment variable.

// For example, in your .env file:
// GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"


// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
});

const db = admin.firestore();

async function seedDatabase() {
  console.log("Seeding initial resource access documents...");

  const resourceAccessCollection = db.collection("resourceAccess");

  // 1. Shared Resources
  const sharedResourcesPath = "Shared Resources";
  const sharedResourcesRef = resourceAccessCollection.doc(sharedResourcesPath);
  await sharedResourcesRef.set({
    visibleTo: ["public"],
  });
  console.log(`- Set permissions for: ${sharedResourcesPath}`);

  // 2. Supervision Resources
  const supervisionResourcesPath = "Supervision Resources";
  const supervisionResourcesRef = resourceAccessCollection.doc(supervisionResourcesPath);
  await supervisionResourcesRef.set({
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
