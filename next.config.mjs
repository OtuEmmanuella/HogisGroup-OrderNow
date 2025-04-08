/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience and to catch issues
  reactStrictMode: true,
  
  // Configure onDemandEntries to help with hydration debugging
  onDemandEntries: {
    // Keep the page in memory for longer while debugging
    maxInactiveAge: 60 * 60 * 1000,
    // Poll for changes more frequently
    pagesBufferLength: 5,
  },
  
  // Your existing config options here...
  webpack: (config, { isServer }) => {
    // Fix for 'electron' module not found error from dependencies like 'got'
    if (!isServer) {
      // Prevent bundling 'electron' on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        electron: false,
      };
    } else {
        // Optional: If you encounter electron issues server-side,
        // you might alias it to a dummy module or handle differently.
        // For now, we primarily address the client-side issue.
    }

    // Ignore warnings about Critical dependency: the request of a dependency is an expression
    // which can happen with dynamic requires in libraries like Keyv adapters.
     config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
     ];


    return config;
  },

  // Add the images configuration block
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'beloved-raccoon-277.convex.cloud', // Your Convex deployment hostname
        port: '',
        pathname: '/api/storage/**', // Allow images specifically from Convex storage API path
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Add Cloudinary hostname
        // port: '', // Optional
        // pathname: '/**', // Optional: Allow any path, or be more specific if desired
      },
      // Add other domains if needed
    ],
  },
};

export default nextConfig; 