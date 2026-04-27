import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-sb-green">Klassi</h1>
          <p className="mt-1 text-sm text-gray-500">Crea tu cuenta y registra tu escuela</p>
        </div>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          afterSignUpUrl="/onboarding"
        />
      </div>
    </main>
  );
}
