"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminSessionStore } from "@/stores/admin-session-store";

export default function LoginPage() {
  const [phone, setPhone] = useState("+998900000001");
  const [error, setError] = useState("");
  const router = useRouter();
  const loginWithPhone = useAdminSessionStore((state) => state.loginWithPhone);

  async function handleLogin() {
    setError("");
    const result = await loginWithPhone(phone);
    if (result.ok) router.replace("/dashboard");
    else setError(result.message || "Login failed");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>NearFIX Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            Operatsion panelga kirish. Auth backend keyingi bosqichda ulanadi.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input onChange={(event) => setPhone(event.target.value)} placeholder="Telefon" value={phone} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="w-full" onClick={handleLogin}>
            Kirish
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
