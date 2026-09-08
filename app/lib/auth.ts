import jwt from "jsonwebtoken";

interface JwtUser {
  id: number;
  email: string;
  role: string;
}

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function createJwtToken(user: JwtUser) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: "30m" }
  );
  return token;
}

export function verifyToken(token: string): JwtPayload {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
  return decoded; // return the whole thing, not just userId
}