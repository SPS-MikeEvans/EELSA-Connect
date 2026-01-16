# Project Summary: Excellent ELSA Connect

## 1. Project Overview
**Excellent ELSA Connect** is a centralized training hub and community platform designed for Emotional Literacy Support Assistants (ELSAs). The application's primary purpose is to facilitate the management, delivery, and tracking of professional training courses and supervision groups. It serves as a bridge between administrators/trainers and ELSA practitioners, providing a secure environment for resource sharing, communication, and course enrollment.

## 2. Core Functionality

### User Management & Authentication
-   **Registration & Login:** Secure user authentication using Firebase Authentication.
-   **Role-Based Access Control (RBAC):** Users are assigned roles (Admin, Trainer, ELSA) which strictly dictate their access to features and data throughout the application.
-   **Profile Management:** Users can manage their personal details and view their current enrollment status.

### Training & Supervision Management
-   **Course Enrollment:** ELSAs can browse and join upcoming training courses.
-   **Supervision Groups:** Dedicated management for supervision cohorts, including membership tracking and session scheduling.
-   **Attendance Tracking:** Trainers and Admins can log and monitor attendance for all sessions.
-   **Capacity Management:** Automatic handling of group sizes with visual indicators for capacity limits.

### Resource Centre
-   **Digital Library:** A robust file sharing system where Admins and Trainers can upload educational materials.
-   **Granular Permissions:** A sophisticated permission system ensures users only see resources relevant to their specific training or supervision group.
-   **Directory Structure:** Nested directory organization for structured content delivery (e.g., "Day 1 Training", "Supervision Resources").

### Payments & Commerce
-   **Stripe Integration:** Seamless integration with Stripe for processing payments for courses and supervision groups.
-   **Automated Enrollment:** Successful payments automatically trigger database updates to confirm user enrollment.

### Communication
-   **Messaging System:** Built-in messaging features to foster community interaction.
-   **Automated Emails:** Transactional emails (via Nodemailer and Gmail) for welcome messages, enrollment confirmations, and updates.

## 3. Technical Architecture & Stack

### Frontend
-   **Framework:** **Next.js 14+ (App Router)** using React Server Components for optimal performance and SEO.
-   **Styling:** **Tailwind CSS** for utility-first, responsive design.
-   **UI Component Library:** **ShadCN UI** provides a set of accessible, reusable, and customizable components (Buttons, Cards, Dialogs, etc.).
-   **Responsiveness:** A fully responsive layout that adapts to all device sizes, utilizing custom hooks like `use-mobile.ts`.

### Backend & Infrastructure (Serverless)
The project leverages the **Firebase** ecosystem for a scalable, serverless backend:
-   **Firebase Authentication:** Handles user identity and session management.
-   **Cloud Firestore:** A NoSQL database storing all application data (users, groups, courses, resources).
-   **Firebase Storage:** Securely stores user-uploaded files and resources.
-   **Cloud Functions:** Serverless Node.js functions that handle background logic:
    -   Stripe webhook processing.
    -   Sending automated emails.
    -   Database triggers (e.g., creating a Stripe product when a course is added).

### Security
-   **Firestore Security Rules:** A rigorous `firestore.rules` file enforces data security at the database level. Rules are written to check user authentication state and specific role claims before allowing reads or writes.
-   **Content Security Policy (CSP):** Implemented to prevent XSS and other code injection attacks.

### Key Libraries & Tools
-   **Stripe SDK:** For handling payment intents and webhooks.
-   **Nodemailer:** For reliable email delivery service.
-   **React Hook Form + Zod:** For robust form validation and handling.
-   **Lucide React:** For consistent and lightweight iconography.

## 4. Design Philosophy
-   **"Act, Don't Tell":** The UI is designed to be intuitive, using subtle animations to guide users without overwhelming them.
-   **Data Privacy:** We strictly adhere to data minimization principles, collecting only essential information (Name, Email, Role) required to deliver the service, as outlined in our Privacy Policy.

## 5. Future Development
This codebase is structured for scalability. Future enhancements could include:
-   Real-time chat features using Firestore listeners.
-   Advanced analytics for training engagement.
-   Expanded certification generation and tracking.
