import { AuthCard } from "../../../components/organisms/AuthCard/AuthCard";
import { RegisterForm } from "../../../components/organisms/RegisterForm/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Start collecting dynamic football NFTs."
      footer={{
        prompt: "Already have an account?",
        linkLabel: "Sign in",
        href: "/login",
      }}
    >
      <RegisterForm />
    </AuthCard>
  );
}
