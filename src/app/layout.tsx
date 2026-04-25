import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "APIMart 电商作图工作台",
  description: "使用 APIMart GPT-Image-2 生成国内电商商品图"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
