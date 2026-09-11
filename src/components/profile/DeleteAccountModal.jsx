import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

// Eliminazione account con conferma sicura: richiede di digitare ELIMINA.
// Lo stato di apertura è legato al parametro URL ?deleteAccount=true, così il
// tasto Indietro hardware / lo swipe iOS chiudono l'overlay senza lasciare la pagina.
// Cancella lato server tutti i post dell'utente, poi chiude la sessione.
export default function DeleteAccountModal({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get("deleteAccount") === "true";
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openModal = () => {
    const next = new URLSearchParams(searchParams);
    next.set("deleteAccount", "true");
    setSearchParams(next);
  };

  const closeModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("deleteAccount");
    setSearchParams(next);
    setConfirmText("");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Elimina l'account e i post lato server (conformità App Store),
      // poi chiude la sessione.
      await api.functions.invoke("deleteUserAccount", {});
      toast.success("Il tuo account e i tuoi dati sono stati eliminati.");
      window.location.assign('/');
    } catch (e) {
      setDeleting(false);
      toast.error("Eliminazione fallita: " + (e?.response?.data?.error || e.message));
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className="rounded-full text-destructive hover:text-destructive"
        onClick={openModal}
      >
        <Trash2 className="w-4 h-4 mr-2" /> Elimina account
      </Button>
      <AlertDialog open={open} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'account?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è definitiva: verranno eliminati tutti i tuoi post salvati nella
              libreria e verrai disconnesso. Digita <strong>ELIMINA</strong> per confermare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label="Digita ELIMINA per confermare"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINA"
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText !== "ELIMINA" || deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminazione…
                </>
              ) : (
                "Elimina definitivamente"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
