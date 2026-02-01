import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="size-4" />
            Back to Home
        </Link>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-bold mt-6">1. Introduction</h2>
          <p>
            Welcome to ELSA Training Hub ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
          </p>

          <h2 className="text-xl font-bold mt-6">2. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the application. The personal information we collect includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
                <strong>Name:</strong> Collected for user identification within the community (legitimate interest) and personalization of your user experience (consent).
            </li>
            <li>
                <strong>Email Address:</strong> Used for account creation, authentication, sending essential service notifications (e.g., password resets, system updates) (contractual necessity, legitimate interest), and for direct communication if initiated by you.
            </li>
            <li>
                <strong>Password:</strong> Stored securely (hashed) for authentication purposes (contractual necessity).
            </li>
            <li>
                <strong>User Role:</strong> Collected to manage access to specific resources and functionalities within the digital library (contractual necessity, legitimate interest).
            </li>
            <li>
                <strong>Internal Messages:</strong> Content of internal messages are processed to facilitate communication within the platform (contractual necessity, legitimate interest). Note that content may be accessible to authorized administrators for moderation or technical support as per our Terms & Conditions.
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4">Automated Data Collection (Cookies & Usage Data)</h3>
          <p>
            We may automatically collect certain information when you visit, use, or navigate the application. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our application, and other technical information. This information is primarily needed to maintain the security and operation of our application, and for our internal analytics and reporting purposes.
          </p>
          <p>
             We use Google Firebase services which may collect this data to ensure the security and performance of the platform. Please refer to our Cookie Policy section below for more details.
          </p>

          <h2 className="text-xl font-bold mt-6">3. How We Use Your Information</h2>
          <p>
            We use personal information collected via our application for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </p>
          <ul className="list-disc pl-6 space-y-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To send you administrative information, such as product, service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
              <li>To fulfill and manage your orders and course enrollments.</li>
              <li>To enable user-to-user communications.</li>
              <li>To protect our Services (e.g., fraud monitoring and prevention).</li>
              <li>To enforce our terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with our contract.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6">4. Data Retention</h2>
          <p>
            We retain personal data for as long as your account is active or as needed to provide you with services. If you request account deletion, your data will be removed within 30 days from our active databases, with backups removed within 90 days, unless a longer retention period is required or permitted by law (e.g., for legal compliance, tax, accounting, or audit purposes).
          </p>

          <h2 className="text-xl font-bold mt-6">5. Sharing Your Information</h2>
          <p>
            We <strong>do not</strong> share, sell, rent, or trade your personal data with third parties for marketing purposes or any other external commercial use. All data processing is contained within this platform to provide the community services. 
          </p>
          <p>
            We only share data with Google Firebase services as necessary for the operation of the platform, acting as our data processor, under strict data processing agreements.
          </p>

          <h2 className="text-xl font-bold mt-6">6. International Data Transfers</h2>
          <p>
            As we utilize Firebase (a Google product), your data may be stored and processed on servers located outside the European Economic Area (EEA), such as in the United States. Google maintains compliance with relevant data protection frameworks, including Standard Contractual Clauses (SCCs) and adherence to the EU-U.S. Data Privacy Framework, UK Extension to the EU-U.S. DPF, and Swiss-U.S. DPF principles. This ensures an adequate level of data protection for international transfers.
          </p>

          <h2 className="text-xl font-bold mt-6">7. Your Data Protection Rights (GDPR Rights)</h2>
          <p>
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Access:</strong> You can request a copy of your personal data.</li>
            <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data.</li>
            <li><strong>Right to Erasure (Right to Be Forgotten):</strong> You can request deletion of your data.</li>
            <li><strong>Right to Restriction of Processing:</strong> You can request to limit how your data is processed.</li>
            <li><strong>Right to Data Portability:</strong> You can request your data in a structured, machine-readable format.</li>
            <li><strong>Right to Object:</strong> You can object to processing based on legitimate interests.</li>
            <li><strong>Rights in relation to automated decision making and profiling:</strong> We do not use automated decision-making or profiling that produces legal effects concerning you.</li>
            <li><strong>Right to Complain:</strong> You have the right to lodge a complaint with a supervisory authority if you believe we are processing your personal data unlawfully.</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-4">How to Exercise Your Rights</h3>
          <p>
            To exercise any of these rights, please contact us at privacy@elsahub.example.com or use the dedicated features in your account settings (for data download and deletion). We will respond to your request within one month.
          </p>

          <h2 className="text-xl font-bold mt-6">8. Cookie Policy</h2>
          <p>
            We use cookies to enhance your experience.
          </p>
          <ul className="list-disc pl-6 space-y-2">
              <li><strong>Strictly Necessary Cookies:</strong> These are essential for you to browse the website and use its features, such as accessing secure areas of the site (e.g., Firebase Authentication cookies).</li>
              <li><strong>Performance/Analytics Cookies:</strong> These allow us to recognize and count the number of visitors and to see how visitors move around our website when they are using it.</li>
          </ul>
          <p>
              You can choose to disable cookies through your individual browser options or via our cookie consent banner. However, this may affect your ability to interact with our application.
          </p>

          <h2 className="text-xl font-bold mt-6">9. Contact Us</h2>
          <p>
            If you have questions or comments about this policy, you may email us at privacy@elsahub.example.com.
          </p>

          <h2 className="text-xl font-bold mt-6">10. Changes to this Privacy Policy</h2>
          <p>
            We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
