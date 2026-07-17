import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/sign-in")({
  component: SignInRoute,
});

function SignInRoute() {
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <p className="mb-2 text-center text-sm font-medium text-amber-700 dark:text-amber-300">
        Demo Mode · Authorized operators only
      </p>
      {isFirstTimeSetup ? (
        <SignUpForm onSwitchToSignIn={() => setIsFirstTimeSetup(false)} />
      ) : (
        <SignInForm onSwitchToSignUp={() => setIsFirstTimeSetup(true)} />
      )}
    </main>
  );
}
