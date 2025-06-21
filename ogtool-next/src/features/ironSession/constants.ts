import { SessionOptions } from "iron-session";


export const userSessionOptions: SessionOptions = {
    password: process.env.USER_SESSION_PASSWORD || "SET_PASWORD",
    cookieName: process.env.USER_SESSION_COOKIE_NAME || "user_session_token",
    cookieOptions: {
        // secure only works in `https` environments
        // if your localhost is not on `https`, then use: `secure: process.env.NODE_ENV === "production"`
        secure: false,
        sameSite: "lax", // CSRF protection
        maxAge: undefined, // undefined means session cookie, or set a value in seconds for persistence
    },
};