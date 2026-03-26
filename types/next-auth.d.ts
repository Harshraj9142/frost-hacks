import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "student" | "faculty";
    avatar?: string;
  }

  interface Session {
    user: {
      id: string;
      role: "student" | "faculty";
      avatar?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "student" | "faculty";
    avatar?: string;
  }
}
