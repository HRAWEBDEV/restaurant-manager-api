// src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/connect";
import { username, openAPI, phoneNumber } from "better-auth/plugins";
import * as schema from "../auth-schema";

const SESSION_REFRESH_THRESHOLD_S = 60 * 5; // 5 minutes
const SESSION_EXPIRE_S = 60 * 60 * 24;
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username(), openAPI()],
  session: {
    expiresIn: SESSION_EXPIRE_S,
    updateAge: SESSION_REFRESH_THRESHOLD_S,
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      active: {
        type: "boolean",
        required: false,
        input: true,
        defaultValue: true,
      },
    },
  },
  socialProviders: {
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // },
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },
});
