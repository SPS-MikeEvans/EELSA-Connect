
import "dotenv/config";
import * as functions from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import Stripe from "stripe";

// Initialize Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Define Secrets
const secretsConfig = defineSecret("FUNCTIONS_CONFIG_EXPORT");

// Initialize Stripe lazily
let stripeInstance: Stripe | null = null;
const getStripe = () => {
    if (stripeInstance) return stripeInstance;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error("Stripe secret key is not set in environment variables.");
        throw new Error("Stripe is not configured.");
    }
    stripeInstance = new Stripe(stripeSecretKey, {
        apiVersion: "2024-04-10",
        typescript: true,
    });
    return stripeInstance;
};

// Helper to get SMTP credentials
const getSmtpConfig = () => {
    // 1. Try environment variables (local dev)
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        return { email: process.env.SMTP_EMAIL, password: process.env.SMTP_PASSWORD };
    }
    // 2. Try Secret Manager (production)
    try {
        const configString = secretsConfig.value();
        if (configString) {
            const config = JSON.parse(configString);
            if (config && config.smtp) {
                return { email: config.smtp.email, password: config.smtp.password };
            }
        }
    } catch (e) {
        // Ignore errors if value() is not ready (e.g. during build)
    }
    
    throw new Error("SMTP configuration not found. Set SMTP_EMAIL/.PASSWORD in .env or FUNCTIONS_CONFIG_EXPORT secret.");
};

// Helper to get email transporter
const getTransporter = () => {
    const { email, password } = getSmtpConfig();
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user: email, pass: password },
    });
};


// ============================================================================
// STRIPE FUNCTIONS
// ============================================================================

export const createStripeProduct = functions.firestore
  .document("{collectionName}/{docId}")
  .onWrite(async (change, context) => {
    const { collectionName } = context.params;
    if (collectionName !== 'trainingCourses' && collectionName !== 'supervisionGroups') return;

    if (!change.after.exists) return; // Document deleted

    const data = change.after.data();
    if (!data) return;
    
    const { name, price, specialistPrice, stripeFullPriceId } = data;
    
    // Core Price Logic
    if (price && price > 0 && !data.stripePriceId) {
        try {
            const stripe = getStripe();
            let productId = data.stripeProductId;
            if (!productId) {
                console.log(`Creating Stripe product for: ${name}`);
                const product = await stripe.products.create({ name });
                productId = product.id;
            }

            console.log(`Creating Stripe price for product ${productId}`);
            const stripePrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round(price * 100),
                currency: 'gbp',
            });
            await change.after.ref.update({ stripeProductId: productId, stripePriceId: stripePrice.id });
            console.log(`Successfully created Stripe product ${productId} and price ${stripePrice.id}`);
        } catch (error) {
            console.error("Stripe product creation failed:", error);
        }
    }

    // Specialist Bundle Price Logic (Only for trainingCourses)
    if (collectionName === 'trainingCourses' && specialistPrice && specialistPrice > 0) {
        if (stripeFullPriceId) return;

        try {
            const stripe = getStripe();
            let productId = data.stripeProductId;
            
            if (!productId) {
                 const product = await stripe.products.create({ name });
                 productId = product.id;
                 await change.after.ref.update({ stripeProductId: productId });
            }

            const fullPriceAmount = Math.round((price + specialistPrice) * 100);
            console.log(`Creating Specialist Bundle Price: ${fullPriceAmount}`);
            
            const fullPrice = await stripe.prices.create({
                product: productId,
                unit_amount: fullPriceAmount,
                currency: 'gbp',
                nickname: 'Core + Specialist Training'
            });

            await change.after.ref.update({ stripeFullPriceId: fullPrice.id });
            console.log(`Successfully created Specialist Bundle price ${fullPrice.id}`);

        } catch (error) {
            console.error("Specialist price creation failed:", error);
        }
    }
});

export const createStripeCheckout = functions.firestore
    .document("/users/{userId}/checkout_sessions/{sessionId}")
    .onCreate(async (snap, context) => {
        const { price, success_url, cancel_url, mode = 'payment', metadata = {} } = snap.data();
        const { userId } = context.params;
        try {
            const stripe = getStripe();
            console.log(`Creating checkout session for user ${userId} with price ${price}`);
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode,
                line_items: [{ price, quantity: 1 }],
                success_url,
                cancel_url,
                metadata,
                customer_email: (await admin.auth().getUser(userId)).email || undefined,
            });
            await snap.ref.set({ url: session.url }, { merge: true });
        } catch (error: any) {
            console.error("Stripe checkout session creation failed:", error.message);
            await snap.ref.set({ error: { message: error.message } }, { merge: true });
        }
    });

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("Stripe webhook secret is not set.");
        res.status(400).send("Webhook secret is not configured.");
        return;
    }
    
    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed.", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, itemType, courseId, groupId } = session.metadata!;
        console.log(`Payment successful for user ${userId}. Item type: ${itemType}`);
        
        const hasSpecialistAccess = session.metadata?.hasSpecialistAccess === 'true';

        try {
            if (itemType === 'trainingCourse' && courseId && userId) {
                const courseRef = db.collection('trainingCourses').doc(courseId);
                const userRef = db.collection('users').doc(userId);
                await db.runTransaction(async (t) => {
                    const courseDoc = await t.get(courseRef);
                    const currentParticipants = courseDoc.data()?.participantIds || [];
                    if (!currentParticipants.includes(userId)) {
                        t.update(courseRef, { participantIds: admin.firestore.FieldValue.arrayUnion(userId) });
                    }
                    
                    const userUpdates: any = { 
                        enrolledCourseId: courseId, 
                        trainingStatus: 'in-training' 
                    };
                    
                    if (hasSpecialistAccess) {
                        userUpdates.hasSpecialistAccess = true;
                    }
                    
                    t.update(userRef, userUpdates);
                });
                console.log(`User ${userId} enrolled in training course ${courseId}. Specialist: ${hasSpecialistAccess}`);
            } else if (itemType === 'supervisionGroup' && groupId && userId) {
                const groupRef = db.collection('supervisionGroups').doc(groupId);
                const userRef = db.collection('users').doc(userId);
                await db.runTransaction(async (t) => {
                    const groupDoc = await t.get(groupRef);
                    const currentMembers = groupDoc.data()?.memberIds || [];
                    if (!currentMembers.includes(userId)) {
                         t.update(groupRef, { memberIds: admin.firestore.FieldValue.arrayUnion(userId) });
                    }
                    t.update(userRef, { supervisionGroupId: groupId });
                });
                console.log(`User ${userId} enrolled in supervision group ${groupId}.`);
            }
            res.status(200).send();
        } catch (error) {
            console.error("Failed to update enrollment after payment:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(200).send();
    }
});

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

export const sendWelcomeEmail = functions
    .runWith({ secrets: [secretsConfig] })
    .auth.user().onCreate(async (user) => {
  const { email, displayName } = user;
  if (!email) return;
  
  try {
      const { email: senderEmail } = getSmtpConfig();
      const mailOptions = { from: `"Excellent ELSA Connect" <${senderEmail}>`, to: email, subject: "Welcome to Excellent ELSA Connect!", html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #4F46E5;">Welcome, ${displayName || "ELSA Colleague"}!</h1><p>We are thrilled to have you join the Excellent ELSA community.</p><ul><li>Comprehensive Training Courses</li><li>Supervision Groups</li><li>Resource Sharing Library</li><li>Community Messaging</li></ul><p style="margin-top: 20px;">We look forward to supporting your journey.</p><p>Best regards,<br/>The Excellent ELSA Team</p></div>` };
      await getTransporter().sendMail(mailOptions); 
      console.log(`Welcome email sent to ${email}`); 
  } catch (error) { console.error("Error sending welcome email:", error); }
});

export const sendMailOnCreate = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("mail/{mailId}").onCreate(async (snap) => {
  const data = snap.data();
  if (!data || !data.to || !data.subject || !data.html) { console.error("Invalid mail document."); return; }
  
  try { 
      const { email: senderEmail } = getSmtpConfig();
      const mailOptions = { from: `"Excellent ELSA Connect" <${senderEmail}>`, to: data.to, subject: data.subject, html: data.html };
      await getTransporter().sendMail(mailOptions); 
      await snap.ref.update({ delivery: { state: "SUCCESS", deliveredAt: admin.firestore.FieldValue.serverTimestamp() } }); 
      console.log(`Generic email sent to ${data.to}`); 
  } catch (error: any) { 
      console.error("Error sending email:", error); 
      await snap.ref.update({ delivery: { state: "ERROR", error: error.message, attemptedAt: admin.firestore.FieldValue.serverTimestamp() } }); 
  }
});

const createConfirmationEmail = (userName: string, itemName: string, type: 'Training' | 'Supervision', detailsHtml: string) => ({
    subject: `Confirmation: Joined ${itemName}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;"><h2 style="color: #4F46E5;">${type} Confirmation</h2><p>Hi ${userName || "there"},</p><p>You have successfully secured a place on <strong>${itemName}</strong>.</p><hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />${detailsHtml}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" /><p>We look forward to seeing you there!</p></div>`,
});

export const onTrainingJoin = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("trainingCourses/{courseId}").onUpdate(async (change) => {
    const before = change.before.data(); const after = change.after.data();
    if (!before || !after) return;
    if ((after.participantIds || []).length <= (before.participantIds || []).length) return;
    const newUserId = after.participantIds.find((id: string) => !before.participantIds.includes(id));
    if (!newUserId) return;
    const user = (await db.collection("users").doc(newUserId).get()).data();
    if (!user?.email) return;
    const formatDate = (ts: any) => ts ? new Date(ts.seconds * 1000).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : "";
    const details = `<h3>Course Details</h3><p><strong>Trainer:</strong> ${after.trainerName}</p><p><strong>Venue:</strong> ${after.venueName}</p><p><strong>Schedule:</strong><br/>Core: ${(after.dates?.core || []).map(formatDate).join("<br/>")}<br/>Specialist: ${(after.dates?.specialist || []).map(formatDate).join("<br/>")}<br/>Supervision: ${(after.dates?.supervision || []).map(formatDate).join("<br/>")}</p>`;
    const email = createConfirmationEmail(user.displayName, after.name, 'Training', details);
    await db.collection("mail").add({ to: user.email, ...email });
});

export const onSupervisionJoin = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("supervisionGroups/{groupId}").onUpdate(async (change) => {
    const before = change.before.data(); const after = change.after.data();
    if (!before || !after) return;
    if ((after.memberIds || []).length <= (before.memberIds || []).length) return;
    const newUserId = after.memberIds.find((id: string) => !before.memberIds.includes(id));
    if (!newUserId) return;
    const user = (await db.collection("users").doc(newUserId).get()).data();
    if (!user?.email) return;
    const formatDate = (ts: any) => ts ? new Date(ts.seconds * 1000).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : "";
    const details = `<h3>Group Details</h3><p><strong>Supervisor:</strong> ${after.supervisorName}</p><p><strong>Venue:</strong> ${after.venueName}</p><p><strong>Session Dates:</strong><br/>${(after.dates || []).map(formatDate).join("<br/>")}</p>`;
    const email = createConfirmationEmail(user.displayName, after.name, 'Supervision', details);
    await db.collection("mail").add({ to: user.email, ...email });
});


// ============================================================================
// USER REGISTRATION & LIFECYCLE FUNCTIONS
// ============================================================================

export const onUserCreate = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("users/{userId}")
    .onCreate(async (snap) => {
        const newUser = snap.data();
        const { email, fullName, role, approvalStatus } = newUser;

        if (!email) return;

        try {
            const { email: senderEmail } = getSmtpConfig();
            
            // Send welcome email to user
            const welcomeMailOptions = {
                from: `"Excellent ELSA Connect" <${senderEmail}>`,
                to: email,
                subject: "Welcome to Excellent ELSA Connect!",
                html: `<p>Hi ${fullName}, welcome to the community!</p>`
            };
            await getTransporter().sendMail(welcomeMailOptions);

            // Send notification to admin if approval is needed
            if (approvalStatus === 'pending') {
                const adminMailOptions = {
                    from: `"Excellent ELSA Connect" <${senderEmail}>`,
                    to: "accounts@summitpsychologyservices.co.uk", // Admin email
                    subject: `New ${role} Registration Requires Approval`,
                    html: `A new user, <strong>${fullName}</strong> (${email}), has registered as a <strong>${role}</strong> and is waiting for approval. Please visit the admin dashboard to review.`
                };
                await getTransporter().sendMail(adminMailOptions);
            }
        } catch (e) { console.error("Email notification failed", e); }
    });

export const onUserStatusUpdate = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("users/{userId}")
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();
        
        if (!before || !after) return;

        // If status fields are not changed, do nothing
        if (before.approvalStatus === after.approvalStatus && before.certificationStatus === after.certificationStatus) {
            return;
        }

        let subject = "";
        let html = "";

        // User account approved
        if (before.approvalStatus === 'pending' && after.approvalStatus === 'approved') {
            subject = "Your Account has been Approved!";
            html = `<p>Hi ${after.fullName},</p><p>Your ${after.role} account on Excellent ELSA Connect has been approved. You can now access all features available to your role.</p>`;
        }
        // ELSA certification approved
        else if (before.certificationStatus === 'pending' && after.certificationStatus === 'approved') {
            subject = "Your ELSA Certificate has been Verified!";
            html = `<p>Hi ${after.fullName},</p><p>Your ELSA certification has been successfully verified. Welcome to the community of qualified ELSAs!</p>`;

            try {
                const { email: senderEmail } = getSmtpConfig();
                // Also notify the Line Manager
                if (after.lineManagerEmail) {
                    const managerMailOptions = {
                        from: `"Excellent ELSA Connect" <${senderEmail}>`,
                        to: after.lineManagerEmail,
                        subject: `ELSA Verified: ${after.fullName}`,
                        html: `<p>This is to confirm that the ELSA certification for <strong>${after.fullName}</strong>, who is under your line management, has been verified on the Excellent ELSA Connect platform.</p>`
                    };
                    await getTransporter().sendMail(managerMailOptions);
                }
            } catch (e) { console.error("Line manager notification failed", e); }
        }

        if (subject && html && after.email) {
            try {
                const { email: senderEmail } = getSmtpConfig();
                const mailOptions = { from: `"Excellent ELSA Connect" <${senderEmail}>`, to: after.email, subject, html };
                await getTransporter().sendMail(mailOptions);
            } catch (e) { console.error("Status update email failed", e); }
        }
    });

export const onUserRoleChange = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();
        
        if (!before || !after) return;

        // --- Role Promotion: User -> Trainee on course enrollment ---
        if (!before.enrolledCourseId && after.enrolledCourseId) {
            if (after.role === 'User') {
                await change.after.ref.update({ 
                    role: 'Trainee', 
                    trainingStatus: 'in-training',
                    lastRoleUpdate: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`User ${after.uid} promoted to Trainee.`);
            }
        }

        // --- Role Demotion: ELSA -> User on leaving supervision ---
        if (before.supervisionGroupId && !after.supervisionGroupId) {
            if (after.role === 'ELSA') {
                await change.after.ref.update({ 
                    role: 'User',
                    lastRoleUpdate: admin.firestore.FieldValue.serverTimestamp() 
                });
                console.log(`ELSA ${after.uid} demoted to User due to leaving supervision.`);
            }
        }
    });

export const onCourseCompletion = functions.firestore
    .document("trainingCourses/{courseId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        
        if (!before || !after) return;

        // Get list of all dates
        const allDates = [
            ...(after.dates.core || []),
            ...(after.dates.specialist || []),
            ...(after.dates.supervision || [])
        ];
        const requiredSessions = allDates.length;
        if (requiredSessions === 0) return; // Not a valid course to check

        // Find users whose attendance might have changed
        const beforeAttendance = before.attendance || {};
        const afterAttendance = after.attendance || {};
        
        const potentiallyCompletedUsers = new Set<string>();

        // Check which users have new attendance marks
        for (const dateKey in afterAttendance) {
            const beforeUsers = new Set(beforeAttendance[dateKey] || []);
            const afterUsers = new Set(afterAttendance[dateKey] || []);

            afterUsers.forEach((uid: any) => {
                if (!beforeUsers.has(uid)) {
                    potentiallyCompletedUsers.add(String(uid));
                }
            });
        }
        
        if (potentiallyCompletedUsers.size === 0) return;

        console.log(`Checking for completion for users:`, Array.from(potentiallyCompletedUsers));

        // For each user with new attendance, check if they graduated
        for (const userId of potentiallyCompletedUsers) {
            let attendedCount = 0;
            for (const dateKey in afterAttendance) {
                if (afterAttendance[dateKey].includes(userId)) {
                    attendedCount++;
                }
            }

            console.log(`User ${userId} has attended ${attendedCount}/${requiredSessions} sessions.`);

            if (attendedCount >= requiredSessions) {
                // Graduate the user!
                const userRef = db.collection('users').doc(userId);
                const userSnap = await userRef.get();
                if (userSnap.exists && userSnap.data()?.role === 'Trainee') {
                    console.log(`Graduating user ${userId} to ELSA.`);
                    await userRef.update({
                        role: 'ELSA',
                        trainingStatus: 'trained',
                        enrolledCourseId: null, // Un-enroll from course
                        lastRoleUpdate: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
    });

// ============================================================================
// CHAT & MESSAGING FUNCTIONS
// ============================================================================

// Helper to look up UID from email
async function lookupUserByEmail(email: string): Promise<string | null> {
    if (!email) return null;
    try {
        const user = await admin.auth().getUserByEmail(email);
        return user.uid;
    } catch (e) {
        console.log(`Could not find user for email ${email}`);
        return null;
    }
}

export const createTrainingChat = functions.firestore
    .document("trainingCourses/{courseId}")
    .onCreate(async (snap, context) => {
        const courseId = context.params.courseId;
        const data = snap.data();
        
        let adminIds: string[] = [];
        
        // Add Trainer if email matches a user
        if (data.trainerEmail) {
            const trainerId = await lookupUserByEmail(data.trainerEmail);
            if (trainerId) adminIds.push(trainerId);
        }

        // Add creator if available (optional tracking in future)
        // For now, we rely on trainerEmail.

        await db.collection("chats").doc(courseId).set({
            name: `${data.name} (Course Chat)`,
            type: 'training',
            linkedEntityId: courseId,
            adminIds: adminIds,
            memberIds: adminIds, // Starts with just admins
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Created chat channel for Training Course ${courseId}`);
    });

export const createSupervisionChat = functions.firestore
    .document("supervisionGroups/{groupId}")
    .onCreate(async (snap, context) => {
        const groupId = context.params.groupId;
        const data = snap.data();
        
        let adminIds: string[] = [];
        
         // Add Supervisor if email matches a user
        if (data.supervisorEmail) {
            const supervisorId = await lookupUserByEmail(data.supervisorEmail);
             if (supervisorId) adminIds.push(supervisorId);
        }
        
        await db.collection("chats").doc(groupId).set({
            name: `${data.name} (Supervision Chat)`,
             type: 'supervision',
            linkedEntityId: groupId,
            adminIds: adminIds,
            memberIds: adminIds,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Created chat channel for Supervision Group ${groupId}`);
    });

export const syncTrainingChatMembers = functions.firestore
    .document("trainingCourses/{courseId}")
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        
        // Only update if participants changed
        if (JSON.stringify(after.participantIds) === JSON.stringify(before.participantIds)) return;
        
        const chatId = context.params.courseId;
        const chatRef = db.collection("chats").doc(chatId);
        const chatDoc = await chatRef.get();
        
        if (!chatDoc.exists) return; // Should exist, but fail safe
        
        const currentAdmins = chatDoc.data()?.adminIds || [];
        // Members = Admins + Participants
        const newMembers = Array.from(new Set([...currentAdmins, ...(after.participantIds || [])]));
        
        await chatRef.update({
            memberIds: newMembers
        });
        
        console.log(`Synced members for Training Chat ${chatId}`);
    });

export const syncSupervisionChatMembers = functions.firestore
    .document("supervisionGroups/{groupId}")
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        
        // Only update if members changed
        if (JSON.stringify(after.memberIds) === JSON.stringify(before.memberIds)) return;
        
        const chatId = context.params.groupId;
        const chatRef = db.collection("chats").doc(chatId);
        const chatDoc = await chatRef.get();
        
        if (!chatDoc.exists) return; 
        
        const currentAdmins = chatDoc.data()?.adminIds || [];
        const newMembers = Array.from(new Set([...currentAdmins, ...(after.memberIds || [])]));
        
        await chatRef.update({
             memberIds: newMembers
        });
        
        console.log(`Synced members for Supervision Chat ${chatId}`);
    });

// ============================================================================
// FEEDBACK FUNCTIONS
// ============================================================================

export const onFeedbackCreate = functions
    .runWith({ secrets: [secretsConfig] })
    .firestore.document("feedback/{feedbackId}")
    .onCreate(async (snap) => {
        const feedback = snap.data();
        
        try {
            const { email: senderEmail } = getSmtpConfig();
            const adminEmail = "accounts@summitpsychologyservices.co.uk"; // Or configurable

            const mailOptions = {
                from: `"Excellent ELSA Bot" <${senderEmail}>`,
                to: adminEmail,
                subject: `[${feedback.type}] New Feedback Submitted`,
                html: `
                    <h2>New ${feedback.type} Report</h2>
                    <p><strong>User:</strong> ${feedback.userEmail} (${feedback.userId})</p>
                    <p><strong>Page:</strong> ${feedback.pageUrl}</p>
                    <p><strong>Description:</strong></p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 5px solid #ccc;">
                        ${feedback.description}
                    </blockquote>
                    ${feedback.screenshotUrl ? `<p><a href="${feedback.screenshotUrl}">View Screenshot</a></p>` : ''}
                    <p><a href="https://excellent-elsa-connect.web.app/admin/feedback">Manage Feedback</a></p>
                `
            };

            await getTransporter().sendMail(mailOptions);
            console.log(`Feedback notification sent for ${snap.id}`);
        } catch (error) {
            console.error("Error sending feedback notification:", error);
        }
    });
