import { NextResponse } from "next/server";
import { ensureDbAndUserModel, hashPassword, signToken, setAuthCookie } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Email and password (min 6 chars) are required." }, { status: 400 });
    }

    const User = await ensureDbAndUserModel();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({ email, password: hashed });

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({ user: { email: user.email, id: user._id } }, { status: 201 });
  } catch (err) {
    console.error("Signup error", err);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
