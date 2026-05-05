import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui";
import { GoogleIcon } from "@/components/ui/icons/GoogleIcon";

export function GoogleAuthButton() {
  return (
    <Button
      variant="glass"
      size="lg"
      onClick={signInWithGoogle}
      className="mb-12"
    >
      <GoogleIcon />
      Se connecter avec Google
    </Button>
  );
}
