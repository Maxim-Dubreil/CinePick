import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui";
import { GoogleIcon } from "@/components/ui/icons/GoogleIcon";

export function GoogleAuthButton() {
  return (
    <Button
      variant="glass-primary"
      size="lg"
      onClick={signInWithGoogle}
      className="mb-12"
      style={{ borderRadius: "var(--radius-xl)" }}
    >
      <GoogleIcon />
      Se connecter avec Google
    </Button>
  );
}
