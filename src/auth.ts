import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days — stay logged in for a month
    updateAge: 24 * 60 * 60,   // Only refresh the session cookie once per day
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth }) {
      // Returning true means the request is authorized
      return !!auth?.user;
    },
  },
});
