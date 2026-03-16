import createNextIntlPlugin from "next-intl/plugin"

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "unload=(self)", // 允许当前域名使用 unload 事件
          },
        ],
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
export default withNextIntl(nextConfig)
