import React from "react";
import SetupWizard from "@/components/setup/SetupWizard";
import WorkspaceHeader from "@/components/WorkspaceHeader";

export default function BusinessSetup() {
  return (
    <div className="min-h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom))] md:min-h-screen bg-background flex flex-col">
      <WorkspaceHeader subtitle="Configurazione" showGuide={false} />
      <main className="flex-1 flex flex-col justify-center px-5 sm:px-8 py-4 sm:py-10">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight mt-2">
            Presentaci la tua attività.
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Bastano nome e categoria per iniziare. Le informazioni che aggiungi aiutano a creare post adatti a te.
          </p>
        </div>
        <SetupWizard />
      </main>
    </div>
  );
}
