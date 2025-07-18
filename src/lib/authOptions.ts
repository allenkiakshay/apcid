import { NextAuthOptions } from "next-auth";
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
      role: "ADMIN" | "USER" | "SUPER_ADMIN";
      exp?: number; // ✅ Added for timer tracking
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    hallticket?: string;
    role: "ADMIN" | "USER" | "SUPER_ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    hallticket?: string;
    role: "ADMIN" | "USER" | "SUPER_ADMIN";
    exp?: number; // ✅ Added for timer tracking
  }
}

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 45 * 60, // 45 minutes
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
            throw new Error("Invalid email or password."); // ✅ Use generic error
          }

          const allowedRoles = ["ADMIN", "USER", "SUPER_ADMIN"] as const;
          if (!allowedRoles.includes(user.role as any)) {
            throw new Error("User role is not allowed.");
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { logedInAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            hallticket: user.hallticket ?? undefined,
            role: user.role as "ADMIN" | "USER" | "SUPER_ADMIN",
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
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.hallticket = user.hallticket;
        token.role = user.role;
        token.exp = Math.floor(Date.now() / 1000) + 45 * 60; // ✅ Set JWT expiry (in seconds)
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.hallticket = token.hallticket;
        session.user.role = token.role as "ADMIN" | "USER" | "SUPER_ADMIN";
        session.user.exp = token.exp; // ✅ Pass exp to session for client timer
      }
      return session;
    },
  },
};
