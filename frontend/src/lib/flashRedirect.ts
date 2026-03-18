import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export function redirectWithAccessDenied(message: string): never {
  const homeWithFlashbag = `${ROUTES.HOME}?error=app&message=${encodeURIComponent(
    message,
  )}`;
  redirect(homeWithFlashbag);
}

