import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface EmailAttachment {
  filename: string;
  content: string; // base64 string
  encoding?: string; // usually 'base64'
  path?: string; // or path to file
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Adds an email request to the Firestore 'mail' collection.
 * The Cloud Function 'sendMailOnCreate' will pick this up and send it.
 */
export async function sendEmail({ to, subject, html, attachments }: SendEmailParams) {
  try {
    const emailData: any = {
      to,
      subject,
      html,
      createdAt: serverTimestamp(),
      delivery: {
        state: "PENDING"
      }
    };

    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments;
    }

    await addDoc(collection(db, "mail"), emailData);
    return true;
  } catch (error) {
    console.error("Failed to queue email:", error);
    return false;
  }
}

/**
 * Helper to send a notification about a new message.
 */
export async function sendNewMessageNotification(toEmail: string, senderName: string, messagePreview: string) {
  return sendEmail({
    to: toEmail,
    subject: `New Message from ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">New Message</h2>
        <p><strong>${senderName}</strong> sent you a message:</p>
        <blockquote style="border-left: 4px solid #4F46E5; padding-left: 15px; color: #555; background: #f9f9f9; padding: 10px;">
          ${messagePreview}
        </blockquote>
        <p style="margin-top: 20px;">
            <a href="https://excellentelsa-connect.web.app/messages" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply Now</a>
        </p>
      </div>
    `
  });
}
