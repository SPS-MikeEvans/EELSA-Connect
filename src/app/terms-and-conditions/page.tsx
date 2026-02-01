import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="size-4" />
            Back to Home
        </Link>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-bold mt-6">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the ELSA Training Hub application, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, then you may not access the service.
          </p>

          <h2 className="text-xl font-bold mt-6">2. User Accounts</h2>
          <p>
            When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>
          <p>
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>

          <h2 className="text-xl font-bold mt-6">3. User Conduct</h2>
          <p>
            You agree to use the internal messaging system and resource center only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the website. Prohibited behavior includes harassing or causing distress or inconvenience to any other user, transmitting obscene or offensive content, or disrupting the normal flow of dialogue within the Service.
          </p>

          <h2 className="text-xl font-bold mt-6">4. Content Ownership & Usage</h2>
          <p>
            <strong>Your Content:</strong> Users may post, upload, or otherwise contribute content to the Service (e.g., resources, chat messages). By providing content, you grant us a non-exclusive, transferable, sub-licensable, royalty-free, worldwide license to use any content that you post on or in connection with the Service for the purpose of operating and improving the Service.
          </p>
          <p>
            <strong>Our Content:</strong> The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of ELSA Training Hub and its licensors.
          </p>

          <h2 className="text-xl font-bold mt-6">5. Moderation Policy</h2>
          <p>
            We reserve the right to monitor and moderate all content submitted to the platform, including the internal messaging system and resource uploads. We have the right to remove any content that violates these Terms or that we determine is offensive, illegal, or otherwise objectionable.
          </p>

          <h2 className="text-xl font-bold mt-6">6. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of ELSA Training Hub and its licensors. The Service is protected by copyright, trademark, and other laws of both the United Kingdom and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of ELSA Training Hub.
          </p>

          <h2 className="text-xl font-bold mt-6">7. Disclaimers & Limitation of Liability</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
          </p>
          <p>
            In no event shall ELSA Training Hub, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
          </p>

          <h2 className="text-xl font-bold mt-6">8. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or delete your account via the settings page.
          </p>

          <h2 className="text-xl font-bold mt-6">9. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.
          </p>

          <h2 className="text-xl font-bold mt-6">10. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2 className="text-xl font-bold mt-6">11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@elsahub.example.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
