
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, DocumentData, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

// Expanded User Roles
export type UserRole = 'User' | 'ELSA' | 'Trainee' | 'LineManager' | 'Trainer' | 'Admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserDetails extends DocumentData {
    // Core Identity
    uid: string;
    fullName: string;
    email: string;
    photoURL?: string;
    
    // Role Management
    role: UserRole;
    additionalRoles: UserRole[];
    lastRoleUpdate: any;

    // Status Fields
    approvalStatus: ApprovalStatus; // For LineManager, Trainer
    
    // Timestamps
    createdAt: any;
    lastSeen: any;

    // ELSA-specific Fields
    certificationStatus?: ApprovalStatus;
    certificationUploadPath?: string;
    certificationWhereTrained?: string;
    certificationYear?: string;
    schoolSetting?: string;
    lineManagerEmail?: string;
    
    // Association Fields
    linkedLineManagerId?: string | null;
    linkedStaffIds?: string[];
    inviteId?: string; // To track signup via invitation
    
    // Deprecated/Legacy fields - kept for compatibility
    organization?: string;
    trainingStatus?: 'in-training' | 'trained' | null;
    enrolledCourseId?: string | null;
    supervisionGroupId?: string | null;
}

interface UserContextType {
    user: FirebaseUser | null | undefined;
    userDetails: UserDetails | null;
    userRole: UserRole | null;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const updateLastSeen = (uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    const data = { lastSeen: serverTimestamp() };
    updateDoc(userDocRef, data)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [authUser, authLoading] = useAuthState(auth);
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!authUser) {
            setUserDetails(null);
            setUserRole(null);
            setIsLoading(false);
            return;
        }

        const userDocRef = doc(db, 'users', authUser.uid);
        
        // This listener only READS data.
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserDetails;
                setUserDetails(data);
                setUserRole(data.role);

                if (auth.currentUser && auth.currentUser.photoURL !== data.photoURL && data.photoURL) {
                    updateProfile(auth.currentUser, { photoURL: data.photoURL });
                }
            } else {
                setUserDetails(null);
                setUserRole(null);
            }
            setIsLoading(false);
        });
        
        // This effect handles WRITING the lastSeen timestamp.
        // It runs once on auth change and then on an interval.
        updateLastSeen(authUser.uid); // Initial update
        const intervalId = setInterval(() => {
            if (auth.currentUser) {
              updateLastSeen(auth.currentUser.uid);
            }
        }, 60 * 1000); // Update every 60 seconds

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        }
    }, [authUser, authLoading]);

    const value = {
        user: authUser,
        userDetails,
        userRole,
        isLoading: isLoading || authLoading,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
