import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/config/adminWhitelist";

const providers: NextAuthOptions["providers"] = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h admin sessions
  pages: { signIn: "/admin", error: "/admin" },
  callbacks: {
    // Non-whitelisted accounts can't even establish a session.
    async signIn({ user }) {
      return isAdminEmail(user.email);
    }
  }
};

/** Use at the top of every /api/admin/* handler. Returns the admin's e-mail or a ready-made error response. */
export async function requireAdmin(): Promise<{ email: string } | { error: NextResponse }> {
  let email: string | null | undefined;
  try {
    email = (await getServerSession(authOptions))?.user?.email;
  } catch {
    // Misconfigured auth (e.g. missing NEXTAUTH_SECRET) must fail closed, never open.
    email = null;
  }
  if (!email) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (!isAdminEmail(email)) return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  return { email };
}
