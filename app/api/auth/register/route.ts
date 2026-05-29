import { NextResponse } from "next/server";
import { createUser } from "@/lib/user-auth";

type RegisterBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const email = body.email?.trim();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required", code: "INVALID_INPUT", detail: "Missing email or password" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters", code: "INVALID_PASSWORD", detail: "Password too short" },
        { status: 400 }
      );
    }

    const userId = await createUser(email, password);

    return NextResponse.json({ ok: true, data: { userId } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";

    if (message === "EMAIL_IN_USE") {
      return NextResponse.json(
        { ok: false, error: "Email already in use", code: "EMAIL_IN_USE", detail: "Choose a different email address" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Registration failed", code: "REGISTRATION_FAILED", detail: message },
      { status: 500 }
    );
  }
}
