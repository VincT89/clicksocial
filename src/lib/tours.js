export const TOURS = {
  '/': [
    { selector: '[data-tour="cta-primary"]', title: 'Il tuo spazio per i contenuti', body: 'Da qui puoi creare il tuo account. Se hai già effettuato l’accesso, usa l’icona Studio nella barra di navigazione per riprendere il lavoro.' },
    { selector: '[data-tour="hero-mockup"]', title: 'Dalla foto al piano editoriale', body: 'Questa foto è un esempio dimostrativo. Nello Studio lavori sulle tue immagini; la Libreria raccoglie i contenuti salvati e le date.' },
  ],
  '/studio': [
    { selector: '[data-tour="studio-uploader"]', title: 'Scegli o scatta una foto', body: 'Carica un file oppure apri la fotocamera. Lo scatto viene caricato solo dopo aver premuto Usa foto.' },
    { selector: '[data-tour="studio-editor"]', title: 'La tua anteprima', body: 'Controlla il risultato mentre modifichi filtri e titolo. Puoi cambiare sezione e ritrovare la bozza tornando qui.' },
    { selector: '[data-tour="studio-presets"]', title: 'Ritocco della foto', body: 'Scegli un filtro rapido oppure usa le barre delle regolazioni manuali. Premi una barra per sbloccarla senza cambiare il valore, poi regola il cursore. Il lucchetto la blocca di nuovo; Ripristina riporta la foto ai valori originali.' },
    { selector: '[data-tour="studio-mode"]', title: 'Scegli la modalità', body: 'Original mantiene la foto, Enhance la ritocca con AI, Creative crea una grafica con AI. Seleziona il pulsante della modalità che vuoi usare.' },
    { selector: '[data-tour="studio-tone"]', title: 'Come vuoi parlare', body: 'Scegli l’avatar del tono da usare nei testi. Puoi comunque modificare tutto manualmente.' },
    { selector: '[data-tour="studio-copy-result"]', title: 'Scrivi o rivedi i testi', body: 'Titolo grafica, caption e hashtag restano modificabili. Copia tutto trasferisce caption e hashtag negli appunti.' },
    { selector: '[data-tour="studio-save"]', title: 'Salva nella Libreria', body: 'Salva foto e testi. Dalla Libreria potrai assegnare una data nel calendario, scaricare il contenuto o programmare l’invio a Facebook se disponibile.' },
  ],
  '/library': [
    { selector: '[data-tour="library-views"]', title: 'Scegli come vedere i contenuti', body: 'Calendario mostra le date, Tutti i post raccoglie la Libreria completa e Da pianificare contiene i post ancora senza data.' },
    { selector: '[data-tour="library-calendar"]', title: 'Il calendario della Libreria', body: 'Cambia mese e seleziona un giorno per vedere i contenuti previsti nell’agenda. Puoi muoverti tra le date anche con le frecce della tastiera.' },
    { selector: '[data-tour="library-filters"]', title: 'Trova un contenuto', body: 'Filtra per piattaforma, stato o testo. I filtri si applicano sia al calendario sia agli elenchi.' },
    { selector: '[data-tour="library-agenda"]', title: 'Organizza la giornata', body: 'Modifica data sposta un contenuto nel calendario. Il menu Altre azioni raccoglie download, copia e pubblicazione. L’invio automatico Facebook resta un’operazione distinta e richiede Pro e una Pagina collegata.' },
    { selector: '[data-tour="library-unscheduled"]', title: 'Contenuti da pianificare', body: 'Apri questa vista e scegli Pianifica su un post: assegna una data e delle note, senza pubblicare sui social.' },
    { selector: '[data-tour="library-new"]', title: 'Aggiungi un contenuto', body: 'Nuovo post apre lo Studio. Salva il contenuto per ritrovarlo nella Libreria.' },
  ],
  '/profilo': [
    { selector: '[data-tour="profile-administration"]', title: 'Area azienda e Sviluppatore', body: 'L’edificio apre Area azienda, con clienti e piani; l’icona codice apre Sviluppatore, con registro AI e stime dei costi. Sono visibili solo agli amministratori, nella barra superiore o in basso sul telefono.' },
    { selector: '[data-tour="profile-navigation"]', title: 'Le voci del profilo', body: 'Usa i pulsanti Attività, Social, Piano e Account per aprire la relativa sezione.' },
    { selector: '[data-tour="profile-company"]', title: 'La tua attività', body: 'Seleziona la categoria dal menu e scegli l’avatar del tono di voce. Salva le modifiche perché vengano usate nelle generazioni successive.' },
    { selector: '[data-tour="profile-social"]', title: 'Collegamenti social', body: 'L’invio automatico è disponibile per le Pagine Facebook autorizzate. I post per Instagram e TikTok possono essere pianificati e scaricati per la pubblicazione manuale.' },
    { selector: '[data-tour="profile-plan"]', title: 'Il piano del tuo account', body: 'Il piano Pro rimuove il limite delle generazioni e abilita l’invio programmato a Facebook. I servizi devono essere configurati anche con Pro.' },
  ],
};

