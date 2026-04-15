import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "./jwt";

export function getAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("Authorization");
  const queryToken = req.nextUrl.searchParams.get("authorization");
  
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) return null;
  
  return verifyToken(token);
}
