# Excellent ELSA Connect - Project Summary

## Overview
**Excellent ELSA Connect** is a comprehensive training and community platform designed for Emotional Literacy Support Assistants (ELSAs). It serves as a central hub for managing training cohorts, supervision groups, resource sharing, and professional development.

The platform streamlines the administrative workflow for trainers and line managers while providing ELSAs with a dedicated space to track their progress, access resources, and connect with peers.

## Core Features

### 1. User Roles & Permissions
The system supports distinct user roles with tailored dashboards and permissions:
*   **ELSA:** The primary user. Can enroll in training, join supervision groups, access resources, and log journal entries.
*   **Trainee:** An ELSA currently undergoing initial training. Has access to course materials and tracks attendance.
*   **Line Manager:** Oversees ELSAs within their school/setting. Can view certification status and attendance reports.
*   **Trainer:** Delivers training and leads supervision groups. Manages attendance, uploads resources, and oversees cohorts.
*   **Admin:** Full system access to manage users, roles, courses, and platform settings.

### 2. Training Course Management
*   **Cohort Management:** Admins can create and schedule training cohorts (e.g., "Autumn 2024").
*   **Enrollment:** Trainees can register for courses.
*   **Attendance Tracking:** Trainers can log attendance for Core, Specialist, and Supervision days.
*   **Completion:** Automated tracking of session attendance to determine graduation eligibility.

### 3. Supervision Group Management
*   **Regional Groups:** Management of ongoing supervision groups organized by region or venue.
*   **Membership:** ELSAs can join specific supervision groups to maintain their certification status.
*   **Capacity Management:** Visual indicators for group size and availability.

### 4. Resource Centre
*   **Digital Library:** A secure repository for training handouts, worksheets, and intervention guides.
*   **Granular Access:** Resources are categorized by directory permissions (e.g., "Trainee Resources" vs. "General ELSA Resources").
*   **File Management:** Support for uploading PDFs, images, and documents with nested directory structures.

### 5. Communication & Engagement
*   **Internal Messaging:** A direct messaging system for users to communicate with trainers or peers.
*   **Email Notifications:** Automated transactional emails for welcome messages, status updates, and enrollment confirmations (via Nodemailer).

### 6. Technical Infrastructure
*   **Frontend:** Next.js 15 (App Router) with React Server Components.
*   **Styling:** Tailwind CSS with ShadCN UI for a consistent, accessible design system.
*   **Backend:** Firebase (Authentication, Firestore, Storage, Cloud Functions).
*   **AI Integration:** Google Genkit for future AI-driven features (e.g., resource recommendations, chatbot support).
*   **Payments:** Stripe integration is configured for future use cases but is currently disabled for course/group enrollments.

## Current Status
The project is in active development. The core authentication, user management, and training/supervision modules are implemented. The payment system has been simplified to direct enrollment, removing the immediate requirement for Stripe transactions for joining groups. The resource center is fully functional with role-based access control.
