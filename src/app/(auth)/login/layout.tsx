import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Aurix Dashboard",
  description: "Sign in to your Aurix Dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
