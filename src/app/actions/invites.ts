
'use server';

import { db as adminDb } from "@/lib/firebase-admin";
import { Timestamp } from 'firebase-admin/firestore';

interface SendInvitePayload {
    toEmail: string;
    fromId: string;
    fromName: string;
    schoolSetting: string;
}

export async function sendInviteAction(payload: SendInvitePayload): Promise<{ success: boolean; error?: string }> {
    try {
        const { toEmail, fromId, fromName, schoolSetting } = payload;

        // 1. Create the invite document
        const inviteRef = await adminDb.collection('invites').add({
            toEmail,
            fromId,
            fromName,
            schoolSetting,
            status: 'pending',
            createdAt: Timestamp.now(),
        });
        const inviteId = inviteRef.id;

        // 2. Create the mail document to trigger the email
        const registrationLink = `https://excellent-elsa-connect.web.app/register?inviteId=${inviteId}`;
        
        await adminDb.collection('mail').add({
            to: toEmail,
            subject: `You've been invited to join Excellent ELSA Connect`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4F46E5;">Invitation from ${fromName}</h1>
                    <p>${fromName} has invited you to join the Excellent ELSA Connect platform for <strong>${schoolSetting}</strong>.</p>
                    <p>Click the button below to register your account.</p>
                    <a href="${registrationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                        Accept Invitation
                    </a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${registrationLink}">${registrationLink}</a>
                    </p>
                </div>
            `,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending invite:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
