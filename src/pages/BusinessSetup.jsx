import React from "react";
import SetupWizard from "@/components/setup/SetupWizard";
import WorkspaceHeader from "@/components/WorkspaceHeader";

export default function BusinessSetup() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WorkspaceHeader subtitle="Configurazione" showGuide={false} />
      <main className="flex-1 flex flex-col justify-center px-5 sm:px-8 py-12">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple">
            Configurazione iniziale
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-2">
            Diamo un'identità ai tuoi post.
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            L'AI conoscerà la tua attività e scriverà copy coerenti con il tuo brand.
          </p>
        </div>
        <SetupWizard />
      </main>
    </div>
  );
}
