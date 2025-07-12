"use server";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@/generated/prisma/client";
import bcrypt from "bcrypt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      hallticket?: string;
      role: "ADMIN" | "USER";
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    hallticket?: string;
    role: "ADMIN" | "USER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    hallticket?: string;
    role: "ADMIN" | "USER";
  }
}

const prisma = new PrismaClient();

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24 hours
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "example@example.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Your password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              name: true,
              hallticket: true,
            },
          });

          if (!user) {
            throw new Error("User not found.");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid password.");
          }

          // Map the role to allowed values, or throw if not allowed
          const allowedRoles = ["ADMIN", "USER"] as const;
          if (!allowedRoles.includes(user.role as any)) {
            throw new Error("User role is not allowed.");
          }

          // Return only the fields required by next-auth User type (no password)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            hallticket: user.hallticket ?? undefined, // Ensure hallticket matches expected type
            role: user.role as "ADMIN" | "USER",
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          throw new Error(
            "An error occurred while authenticating. Please try again."
          );
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Check if `user` has `accessToken` property
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.hallticket = user.hallticket;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.hallticket = token.hallticket;
        session.user.role = token.role as "ADMIN" | "USER"; // Ensure role matches expected type
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

// Export the handler for GET and POST methods
export { handler as GET, handler as POST };
