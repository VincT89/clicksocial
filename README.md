# ClickSocial locale

Progetto autonomo ricavato da `click-social.zip`. Il frontend conserva l'impostazione dell'app esportata; autenticazione, database, file e funzioni sono gestiti dal backend in `server/`. L'app in esecuzione non usa Base44.

Per Android, iPhone, collaudo Wi-Fi e compilazione Codemagic consulta [MOBILE.md](MOBILE.md). I progetti Capacitor sono in `android/` e `ios/`; `AVVIA-MOBILE.cmd` avvia il backend dedicato al collaudo sulla rete locale.

## Aprire l'app

Apri `AVVIA.cmd` con un doppio clic e visita **http://127.0.0.1:5180**. Lascia aperta la finestra di avvio; per fermare l'app premi Ctrl+C. Usa questo indirizzo completo: sulla porta 5173 del computer risponde un altro progetto.

Le dipendenze sono già installate in questa copia. Per una nuova installazione servono Node.js 24.10 o successivo e `npm ci` nella cartella APP. In alternativa al file di avvio puoi usare `npm run local`, che prepara l'interfaccia e avvia l'app. `npm start` avvia la versione già compilata.

Se ClickSocial è già acceso, `npm start` e `npm run local` mostrano l'indirizzo dell'app e terminano senza avviarne una seconda copia o ricompilare. Per applicare modifiche al codice o a `.env`, ferma prima l'istanza attiva con Ctrl+C nel suo terminale e rilancia il comando. Se sulla porta risponde un altro programma, l'avvio lo segnala e non arresta alcun processo.

Registrati dal browser. Il primo account verificato dell'installazione locale diventa amministratore. Senza SMTP, i codici di verifica e i link di recupero password si leggono in **http://127.0.0.1:5180/dev/mail**: i messaggi restano sul computer. Non viene spedita alcuna email.

L’account amministrativo richiesto è **admin@sodanoconsulting.it**, con ruolo amministratore e piano Pro. La password già impostata viene conservata anche nel trasferimento a MySQL. Per impostarla alla prima creazione o recuperarla usa «Password dimenticata» e apri il link nella posta locale; il link dura 30 minuti. Non viene assegnata una password condivisa o predefinita.

## Funzioni locali

- Registrazione, verifica email, accesso, recupero password e cancellazione dell'account.
- Profilo aziendale con avatar illustrati solo per il tono di voce, menu per la categoria, caricamento del logo e pulsanti Attività, Social, Piano e Account.
- Navigazione Studio, Libreria e Profilo con sole icone, nomi accessibili e suggerimenti al passaggio del mouse. Barra superiore su desktop e inferiore su mobile, anche nella home dopo l’accesso.
- Home con le sezioni originali e un mockup iPhone 15 Plus nero in 3D. Trascina il telefono per ruotarlo, anche sul retro; doppio clic, Home o Esc ripristinano la posizione. Sono disponibili anche le frecce della tastiera. Nessuna rotazione automatica e nessuna didascalia visibile sotto il telefono.
- Logo aziendale JPEG, PNG, WebP o GIF fino a 15 MB: limiti visibili prima del caricamento e verificati anche dal backend.
- Nelle nuove grafiche Enhance e Creative, l’AI riserva spazio al logo e analizza la grafica finale e il marchio del Profilo. Indica posizione, fondo uniforme bianco o nero da rimuovere, eventuali vuoti interni delle lettere e aree occupate da testi, grafiche o soggetti. L’app scontorna il logo senza ridisegnarlo, conserva i dettagli interni che non sono indicati come sfondo, ritaglia i margini e mantiene le proporzioni. Il calcolo finale usa le dimensioni del marchio visibile e confronta più posizioni: contrasto con i colori originali del logo, semplicità dello sfondo, allineamenti e vicinanza alla proposta AI. La dimensione iniziale equivale a circa il 2,2% dell’area del post, con limiti adatti ai marchi larghi o verticali; può ridursi al massimo del 20% per trovare spazio. Il controllo geometrico protegge le aree rilevate con una distanza di rispetto del 2% e conserva margini esterni proporzionati: segnala quando non c’è spazio sufficiente. Non vengono aggiunti riquadri bianchi o neri. Il riconoscimento degli elementi dipende dall’analisi AI e il contrasto è una valutazione dei pixel, non una garanzia di leggibilità di ogni dettaglio: controllare l’anteprima. L’analisi usa la chiamata al modello di testo già prevista; i token riportati sono inclusi nel registro Sviluppatore. Original conserva il comportamento senza logo automatico.
- Durante la generazione compare un modale responsive con indicatore di attesa, messaggi a rotazione su Sodano Consulting e collegamento a https://sodanoconsulting.it/. Mostra lo stato reale della richiesta e della composizione del logo, senza percentuali simulate. Può essere ridotto e riaperto, resta disponibile durante il cambio di sezione e si chiude al termine o in caso di errore. La fascia con loader e comando per ridurre la finestra resta fissa; sugli schermi bassi il contenuto scorre sotto, senza passare dietro al pulsante. Il link apre il sito separatamente, mantenendo ClickSocial aperto; animazioni e scorrimento rispettano le preferenze di movimento ridotto e lo spazio disponibile sul dispositivo.
- Foto dal dispositivo o dalla fotocamera, anteprima dello scatto e possibilità di rifarlo prima del caricamento.
- Studio con pulsanti per le modalità, avatar solo per il tono di voce, filtri, titolo sulla foto e modifica manuale di caption e hashtag. Anteprima e foto esportata usano lo stesso disegno.
- Input, aree di testo e menu mantengono caratteri di almeno 16 pixel sui piccoli schermi e sui dispositivi touch, anche in orizzontale e nei modali. Questo evita il tipico zoom di Safari sui campi piccoli senza disabilitare lo zoom manuale. I campi e i gruppi del modulo possono restringersi; le aree di testo si ridimensionano solo in verticale. I filtri rapidi passano a due colonne sugli schermi piccoli, lasciando spazio anche al nome Drammatico.
- Le scrollbar sono nascoste nella pagina, nei campi e nei modali; resta disponibile lo scorrimento con tocco, rotella e tastiera. I controlli nativi seguono il tema chiaro o scuro dell’app.
- Il titolo della modalità Original viene misurato e disposto su righe equilibrate, con dimensione proporzionata a larghezza e altezza della foto, margini e una fascia che non occupa oltre il 42% dell’immagine. Le grafiche AI ricevono un brief con titolo esatto, breve e unico, indicazioni esplicite su dimensione, interlinea, contrasto e gerarchia; i dettagli estesi vanno nella caption. La tipografia disegnata dal modello resta da verificare: non viene misurata come testo modificabile e può richiedere una nuova generazione.
- Le sei barre di regolazione partono bloccate. Premi una barra per sbloccarla senza cambiarne il valore, poi regolala; il lucchetto la blocca di nuovo. Cambiando foto o riaprendo lo Studio le barre tornano bloccate, conservando i valori della bozza o del post. I filtri rapidi restano disponibili nei post modificabili.
- Bozze conservate durante il cambio di sezione. Prima di ricaricare o chiudere la pagina occorre salvare.
- Libreria con viste Calendario, Tutti i post e Da pianificare. Calendario compatto con agenda del giorno, ricerca sempre visibile e filtri per piattaforma e stato. Pianificare un post apre la relativa giornata; rimuovere la data lo riporta tra i contenuti da pianificare. Date e note sono salvate nel database.
- Riapertura con filtri conservati. Le schede mostrano modifica e pianificazione; il menu Altre azioni raccoglie copia, download unico ZIP con immagine e testo, cancellazione e registrazione della pubblicazione manuale.
- Guida contestuale avviata dal pulsante Guida, che si chiude al cambio pagina e all’apertura di una finestra di lavoro.
- Area azienda con utenti e piani e sezione Sviluppatore con registro delle chiamate AI e stime dei costi. Le icone edificio e codice sono nella navigazione degli amministratori, anche su mobile. Guida, tema e azioni dell’intestazione hanno icone con nomi accessibili; la guida individua il collegamento effettivamente visibile.
- Sviluppatore calcola automaticamente le stime in USD per generazione e cliente, includendo testo, immagini, analisi del logo e test di connessione. Il backend salva consumi, modello, livello di servizio e tariffe applicate; i vecchi prezzi medi nel browser non vengono più usati. Il riepilogo riguarda le ultime 500 operazioni registrate, non l’intero account OpenAI. Quando la cache non è comunicata compare un intervallo; con consumi mancanti compare un subtotale esplicito. Gli errori non cancellano i consumi delle fasi già eseguite.

Ogni libreria mostra solo i contenuti del proprio account, anche per gli amministratori. Gli amministratori gestiscono gli utenti e i piani e leggono conteggi e registri dell’installazione. Le immagini caricate richiedono una sessione autorizzata; l’amministratore conserva l’accesso amministrativo ai file.

Una data editoriale è un promemoria: non avvia un invio ai social. Per Facebook occorre usare l’azione separata «Invio automatico Facebook», scegliere una Pagina collegata e confermare la programmazione. «Segna come pubblicato» registra una pubblicazione già eseguita personalmente.

La fotocamera parte solo dopo «Attiva fotocamera» e il consenso del browser. Lo scatto rimane in anteprima fino a «Usa foto»; chiusura della finestra e passaggio in secondo piano fermano lo stream. Se necessario è disponibile anche la fotocamera nativa del dispositivo. La prova con una fotocamera fisica resta da effettuare.

## Servizi da configurare

Alla prima installazione copia `.env.example` in `.env`, inserisci le credenziali dei tuoi servizi e riavvia l'app. Se `.env` esiste già, modifica solo le impostazioni necessarie. Il file resta sul server e non viene incluso nell'interfaccia compilata.

| Servizio | Configurazione | Funzione |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY`, `AI_TEXT_MODEL=gpt-5.6-luna` | Analisi della foto, titolo, caption, hashtag e analisi del logo tramite Responses. |
| Immagini AI | Anche `AI_IMAGE_MODEL=gpt-image-2` | Modalità Enhance e Creative tramite modifica immagini. |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Accesso Google. Callback locale: `http://127.0.0.1:5180/api/oauth/google/callback`. Per collegare un account con password già esistente, accedi prima e usa il pulsante nel Profilo. |
| Facebook | `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` | Collegamento delle Pagine e pubblicazione programmata. Callback dell'app: `/api/oauth/facebook/callback`. Configurare l'app Meta, gli URL ammessi e le autorizzazioni richieste. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Checkout in abbonamento e conferma del piano tramite `/api/stripe/webhook`. Il prezzo è quello del tuo account Stripe. In locale il webhook necessita di un inoltro, ad esempio tramite Stripe CLI. |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, eventuali credenziali e `MAIL_FROM` | Invio effettivo delle email al posto della posta locale. |

Le integrazioni usano direttamente i rispettivi servizi. La precedente configurazione OpenAI è stata verificata con generazioni reali nelle tre modalità. La configurazione attuale Luna con Image 2 è stata verificata con risposte simulate: disponibilità sull’account e qualità di testi e analisi del logo richiedono una prova reale. Google, Meta, Stripe e SMTP richiedono ancora configurazione e prova con gli account effettivi; i relativi test automatici usano risposte esplicitamente di collaudo. La procedura e i callback esatti sono in [CONFIGURAZIONE-SERVIZI.md](CONFIGURAZIONE-SERVIZI.md).

Per contenere i consumi, Luna usa reasoning `none` per il post (massimo 1200 token di output) e il controllo di connessione (32), e `low` per l’analisi del logo (8000, inclusi i token di ragionamento). Le richieste Responses usano il livello Standard (`service_tier: default`); non ci sono tentativi automatici con modelli più costosi. Una risposta incompleta interrompe la generazione e ne conserva i consumi nel registro. Image 2 resta separato, con una grafica 1024 × 1024 per richiesta. Il listino include [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) e i suoi prezzi per contesti lunghi; supplementi cache non quantificabili sono segnalati come stima parziale.

Le impostazioni OpenAI si leggono da `.env` all’avvio del backend: dopo una modifica occorre riavviarlo. Gli avatar inclusi nell’interfaccia sono asset statici generati durante lo sviluppo e non consumano chiamate AI mentre usi l’app. Provenienza e brief sono in `AVATAR.md`.

L'app mantiene la regola originale delle due generazioni AI per gli account Free; Pro rimuove il limite applicativo. Le chiamate vengono comunque addebitate dal fornitore AI al titolare della chiave. Le stime economiche nella pagina Sviluppatore usano i consumi restituiti dall’API e il listino registrato dal backend; non sono una fattura del fornitore.

La pubblicazione automatica implementata riguarda **solo le Pagine Facebook**, con piano Pro. Per Instagram e TikTok si preparano e scaricano i contenuti per la pubblicazione manuale. Il controllo dei post in coda avviene all'avvio e ogni cinque minuti mentre il server è acceso; non parte a computer spento. Dopo un'interruzione durante un invio, controlla la Pagina prima di riprogrammare per evitare duplicati.

## Dati e portabilità

Il backend supporta SQLite e MySQL/MariaDB. `DB_DRIVER` in `.env` sceglie il motore; le variabili `MYSQL_*` configurano la connessione. La procedura per il database locale **click_social**, il trasferimento degli account e la verifica sono in [MYSQL.md](MYSQL.md). Il trasferimento conserva password, ruoli, piani, post, date, sessioni e riferimenti alle immagini, e rifiuta una destinazione già popolata.

Con SQLite, `data/clicksocial.sqlite` contiene il database. Con MySQL i dati sono nel servizio SQL e vanno esportati anche da lì per il backup: copiare soltanto `data` non basta. Con entrambi i motori servono `data/uploads/` per le immagini e `data/.encryption-key` per i dati cifrati. Per un backup coerente ferma l'app, conserva il database attivo, la cartella `data` e `.env`. Non avviare contemporaneamente copie sincronizzate da OneDrive su più computer. Il vecchio SQLite conservato dopo una migrazione non riceve le modifiche successive fatte su MySQL.

Lo ZIP originale non conteneva un'esportazione degli account, dei post del database remoto o dei file privati degli utenti. Questi dati non sono stati importati. Un'eventuale migrazione dei dati esistenti richiede un'esportazione separata; le password gestite da Base44 non sono recuperabili dal codice del progetto.

Questa configurazione serve il computer locale, con bind su `127.0.0.1`. La posta locale è leggibile da chi accede al computer. La pubblicazione su Internet richiede una configurazione dedicata con HTTPS, SMTP, credenziali e callback dei servizi; `npm run local` forza intenzionalmente l'avvio locale.

## Sviluppo e verifiche

- `npm test`: flussi del backend, permessi, persistenza e integrazioni con risposte di collaudo su SQLite isolato.
- `npm run test:mysql`: stessi flussi e migrazione su un server SQL temporaneo; impostare `MYSQL_TEST_SERVER` come descritto in MYSQL.md.
- `npm run db:check:mysql`: verifica della connessione indicata in `.env`, senza modificare il database.
- `npm run db:migrate:mysql`: controllo preliminare del trasferimento SQLite-MySQL, senza copiare dati. L'esecuzione richiede `-- --apply` e l'app ferma.
- `npm run typecheck` e `npm run lint`: controlli sul codice.
- `npm run build`: compilazione dell'interfaccia.
- `npm audit`: vulnerabilità note delle dipendenze.
- `npm run dev`: frontend Vite su 5180 e backend su 8787, in un ambiente che consenta la scansione delle dipendenze di Vite. In questo ambiente desktop la compilazione seguita da avvio locale evita una limitazione di accesso alle cartelle dell'ottimizzatore.

Il codice esportato legato a Base44 è conservato soltanto come riferimento in `work/original-base44/` e non viene eseguito. `work/` contiene anche cache, prove e registri; non serve per eseguire l'app. `package-lock.json` registra le versioni delle dipendenze.

`AUDIT.md` descrive i problemi corretti e i limiti residui; `COLLAUDO.md` riporta le verifiche eseguite. Il comando locale `node scripts/provision-admin.mjs admin@sodanoconsulting.it` è idempotente: conserva le password esistenti e prepara un link locale solo quando manca una password. È riservato all’installazione locale senza SMTP.
