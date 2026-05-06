import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname
  },
  typescript: {
    ignoreBuildErrors: false
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
