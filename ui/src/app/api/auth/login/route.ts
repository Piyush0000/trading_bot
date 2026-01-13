import { NextResponse } from "next/server";
import {
  ensureDbAndUserModel,
  setAuthCookie,
  signToken,
  verifyPassword,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const User = await ensureDbAndUserModel();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({ user: { email: user.email, id: user._id } });
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
