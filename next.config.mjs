/** @type {import('next').NextConfig} */
const nextConfig = {
  // The chat route reads CHATBOT_PROMPT.txt from disk at runtime.
  // Vercel only bundles files it can statically see being imported, so the
  // prompt has to be listed here or the deployed function will 404 on it.
  outputFileTracingIncludes: {
    "/api/chat": ["./CHATBOT_PROMPT.txt"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Allows the Qualtrics survey to embed this page in an <iframe>
            // while blocking every other site from doing so. If your survey is
            // served from a custom domain, add it to this list or the iframe
            // will render blank with a console error about frame-ancestors.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.qualtrics.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
