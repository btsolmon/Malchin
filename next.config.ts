import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Утаснаас LAN IP-ээр (жишээ: 192.168.1.8) орход JS chunk 403
  // авахаас сэргийлнэ — зөвхөн development-д үйлчилнэ.
  allowedDevOrigins: [
    "192.168.1.8",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
  ],
};

export default nextConfig;
