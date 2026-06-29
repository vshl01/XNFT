import { AuthCard } from "../../../components/organisms/AuthCard/AuthCard";
import { LoginForm } from "../../../components/organisms/LoginForm/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your football NFTs."
      footer={{
        prompt: "New here?",
        linkLabel: "Create an account",
        href: "/register",
      }}
    >
      <LoginForm />
    </AuthCard>
  );
}
