
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

// A custom error class to hold detailed context about a Firestore permission error.
// This helps in debugging security rules by providing the exact context of the failed request.
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
        auth: 'Please see the request context in your terminal for auth details.',
        ...context
    }, null, 2)}`;
    
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
