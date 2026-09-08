import jwt from "jsonwebtoken";

interface JwtUser {
  id: number;
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
    { expiresIn: "30m" }, // fixed: was the string "60 * 30", now a valid time string
  );
  return token;
}