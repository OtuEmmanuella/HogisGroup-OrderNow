export default {
  providers: [
    {
      domain:process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
    // Add production configuration
    {
      domain: "https://hogis-group-order-now.vercel.app",
      applicationID: "convex",
    }
  ],
};
