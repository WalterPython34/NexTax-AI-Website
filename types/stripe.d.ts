interface Window {
  Stripe?: (apiKey: string) => {
    redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: { message: string } }>
  }
}
