import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import CustomersTable from "@/components/admin/CustomersTable";
import AiStatusCard from "@/components/admin/AiStatusCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Users, Crown, Image as ImageIcon, Sparkles, Building2 } from "lucide-react";
import { isAdminAccount } from "@/lib/adminAccess";
import WorkspaceHeader from "@/components/WorkspaceHeader";

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-[28px] bg-card p-6 sm:p-8 pwa-shadow">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.auth.me().then(setMe).catch(() => setMe(false));
  }, []);

  useEffect(() => {
    if (isAdminAccount(me)) {
      Promise.all([api.entities.User.list(),api.admin.summary()]).then(([accounts,summary]) => {
        setUsers(accounts); setPostCount(summary.post_count); setLoadError('');
      }).catch(error => setLoadError(error.message));
    }
  }, [me]);

  const handleTogglePlan = async (id, plan) => {
    try {
      await api.entities.User.update(id, { plan });
      setUsers((us) => us.map((u) => (u.id === id ? { ...u, plan } : u)));
      toast.success(plan === "pro" ? "Piano Pro attivato" : "Piano riportato a Gratuito");
    } catch (e) {
      toast.error("Aggiornamento fallito: " + (e?.response?.data?.error || e.message));
    }
  };

  if (me === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminAccount(me)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold mb-2">Area riservata</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Accesso consentito solo all'account aziendale autorizzato.
          </p>
          <Button onClick={() => navigate("/studio")} className="rounded-full">
            Torna allo Studio
          </Button>
        </div>
      </div>
    );
  }

  const proCount = (users || []).filter((u) => u.plan === "pro").length;

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader subtitle="Area azienda" showGuide={false} />

      <main className="workspace-main space-y-6">
        <h1 className="workspace-title">Area azienda</h1>
        {loadError && <div role="alert" className="text-sm text-destructive"><p>Impossibile caricare i dati: {loadError}</p><Button variant="outline" className="mt-3" onClick={() => setMe({ ...me })}>Riprova</Button></div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[24px] bg-card p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <Users className="w-4 h-4" /> Account verificati
            </div>
            <strong className="font-heading text-3xl">{users === null ? "…" : users.length}</strong>
          </div>
          <div className="rounded-[24px] bg-card p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <Crown className="w-4 h-4" /> Account Pro
            </div>
            <strong className="font-heading text-3xl">{users === null ? "…" : proCount}</strong>
          </div>
          <div className="rounded-[24px] bg-card p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <ImageIcon className="w-4 h-4" /> Post salvati
            </div>
            <strong className="font-heading text-3xl">{postCount === null ? "…" : postCount}</strong>
          </div>
        </div>

        <SectionCard
          icon={Sparkles}
          title="Connessione AI"
          subtitle="Stato del motore di generazione dei copy."
        >
          <AiStatusCard />
        </SectionCard>

        <SectionCard
          icon={Building2}
          title="Clienti"
          subtitle="Elenco dei clienti con piano e generazioni AI utilizzate."
        >
          <CustomersTable users={users} onTogglePlan={handleTogglePlan} />
        </SectionCard>
      </main>
    </div>
  );
}
