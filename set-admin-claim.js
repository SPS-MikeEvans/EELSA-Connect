
// set-admin-claim.js
const admin = require('firebase-admin');
const path = require('path');

// --- Configuration ---
// IMPORTANT: Make sure your service account key file is located at this path.
// For local development, you should also set an environment variable:
// export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json'; 

// The email of the user you want to make an admin.
const USER_EMAIL = 'accounts@summitpsychologyservices.co.uk';
// --- End Configuration ---

// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable for this script
process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;

console.log(`Attempting to use service account from: ${path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)}`);

try {
  // Initialize app with default credentials
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log('Firebase Admin SDK initialized successfully using Application Default Credentials.');

} catch (error) {
  console.error('Error initializing Firebase Admin SDK.');
  console.error('Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the file exists.');
  console.error('Original Error:', error.message);
  process.exit(1);
}


async function setAdminClaim() {
  try {
    console.log(`Fetching user by email: ${USER_EMAIL}...`);
    const user = await admin.auth().getUserByEmail(USER_EMAIL);

    if (user.customClaims && user.customClaims.admin === true) {
      console.log(`\n✅ Success! User ${USER_EMAIL} is already an admin.`);
      console.log("No changes made. If permissions are not working, please ensure the user logs out and logs back in.");
      process.exit(0);
      return;
    }

    console.log(`Setting "admin: true" custom claim for user UID: ${user.uid}...`);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`\n✅ Success! Custom claim set for ${USER_EMAIL}. They are now an admin.`);
    console.log('\n******************** IMPORTANT NEXT STEP ********************');
    console.log('The user MUST log out and then log back in for the new admin rights to take effect.');
    console.log('***********************************************************');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error setting custom claim:', error);
    if (error.code === 'auth/user-not-found') {
      console.error(`Could not find a user with the email "${USER_EMAIL}". Please ensure the user has already signed up.`);
    } else if (error.code === 'auth/insufficient-permission') {
        console.error('\nPermission Denied: The service account does not have the "Firebase Authentication Admin" role.');
        console.error('Please go to the Google Cloud Console (IAM & Admin) for your project and grant the service account this role.');
    }
    process.exit(1);
  }
}

setAdminClaim();
