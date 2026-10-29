# ClickSocial locale

Progetto autonomo ricavato da `click-social.zip`. Il frontend conserva l'impostazione dell'app esportata; autenticazione, database, file e funzioni sono gestiti dal backend in `server/`. L'app in esecuzione non usa Base44.

Per caricare il sito e il backend sul sottodominio consulta [PLESK.md](PLESK.md). La guida distingue caricamento da GitHub o pacchetto web, trasferimento del database, chiave di cifratura, SMTP, avvio e attività pianificate. Da Git occorre compilare l’interfaccia: `dist` non è nel repository. Il nuovo avvio pubblico è `app.cjs` (`npm run start:production` per un avvio diretto); `npm start` mantiene il comportamento locale. I trasferimenti dei dati sono descritti anche in [MYSQL.md](MYSQL.md).

Per Android, iPhone, collaudo Wi-Fi e compilazione Codemagic consulta [MOBILE.md](MOBILE.md). I progetti Capacitor sono in `android/` e `ios/`; `AVVIA-MOBILE.cmd` avvia il backend dedicato al collaudo sulla rete locale.

Per firma Apple e compilazione iPhone consulta [IOS-CODEMAGIC.md](IOS-CODEMAGIC.md). La build 1.0 (5) è stata caricata su TestFlight durante il collaudo del 12 settembre. Le modifiche social successive richiedono una nuova build e un backend HTTPS pubblico.

La [guida completa all’uso](GUIDA.md) spiega impostazioni aziendali, cinque template, formati, bozze prima dello shooting, generazione, salvataggio e pubblicazione. Il pulsante Guida nell’app accompagna i controlli presenti in Studio, Libreria e nella sezione aperta del Profilo.

## Aprire l'app

Apri `AVVIA.cmd` con un doppio clic e visita **http://127.0.0.1:5180**. Lascia aperta la finestra di avvio; per fermare l'app premi Ctrl+C. Usa questo indirizzo completo: sulla porta 5173 del computer risponde un altro progetto.

Per installare o aggiornare le dipendenze usa Node.js 24.22.1 o una versione 24 successiva aggiornata e `npm ci` nella cartella APP. Le dipendenze già presenti vanno riallineate al lockfile dopo un aggiornamento; la preparazione del rilascio non aggiorna automaticamente Node o il processo locale in uso. In alternativa al file di avvio puoi usare `npm run local`, che prepara l'interfaccia e avvia l'app. `npm start` avvia la versione già compilata.

Se ClickSocial è già acceso, `npm start` e `npm run local` mostrano l'indirizzo dell'app e terminano senza avviarne una seconda copia o ricompilare. Per applicare modifiche al codice o a `.env`, ferma prima l'istanza attiva con Ctrl+C nel suo terminale e rilancia il comando. Se sulla porta risponde un altro programma, l'avvio lo segnala e non arresta alcun processo.

Registrati dal browser. Il primo account verificato dell'installazione locale diventa amministratore. Senza SMTP, i codici di verifica e i link di recupero password si leggono in **http://127.0.0.1:5180/dev/mail**: i messaggi restano sul computer. Non viene spedita alcuna email.

L’account amministrativo richiesto è **admin@sodanoconsulting.it**, con ruolo amministratore e piano Pro. La password già impostata viene conservata anche nel trasferimento a MySQL. Per impostarla alla prima creazione o recuperarla usa «Password dimenticata» e apri il link nella posta locale; il link dura 30 minuti. Non viene assegnata una password condivisa o predefinita.

## Funzioni locali

- Registrazione, verifica email, accesso, recupero password e cancellazione dell'account.
- Profilo aziendale con tre varianti facoltative del logo (chiaro, scuro, a colori), quattro colori HEX o RGB, font di titoli e testi e template predefinito. Sono accettati HEX di tre o sei cifre con o senza # e tre interi RGB da 0 a 255, con virgole o spazi e prefisso rgb() facoltativo. I valori sono normalizzati in HEX completo prima del salvataggio e dei prompt. Le impostazioni guidano automaticamente i nuovi contenuti.
- Navigazione Studio, Libreria e Profilo con sole icone, nomi accessibili e suggerimenti al passaggio del mouse. Barra superiore su desktop e inferiore su mobile, anche nella home dopo l’accesso.
- Home con le sezioni originali e un mockup iPhone 15 Plus nero in 3D. Trascina il telefono per ruotarlo, anche sul retro; doppio clic, Home o Esc ripristinano la posizione. Sono disponibili anche le frecce della tastiera. Nessuna rotazione automatica e nessuna didascalia visibile sotto il telefono.
- Logo aziendale JPEG, PNG, WebP o GIF fino a 15 MB: limiti visibili prima del caricamento e verificati anche dal backend.
- Cinque template con foto a tutto sfondo: Testi a sinistra (logo in basso a destra), Testi a destra (logo in basso a sinistra), Testi in alto (logo in basso a destra), Testi in basso (logo in alto a destra) e Testi centrati (logo in basso al centro). Le posizioni, i margini e gli allineamenti sono definiti per 1:1 (1080×1080), 4:5 (1080×1350), 9:16 (1080×1920) e 16:9 (1920×1080). L’app sovrappone testi e logo alla fotografia mantenendo la disposizione scelta; anteprima ed esportazione usano lo stesso motore. Il file finale è PNG.
- Nei template l’AI prepara il testo e, per Enhance e Creative, la fotografia. Riceve il brief della bozza, il template, il formato, i font, i colori e le coordinate delle zone riservate a testi e logo, con margine di rispetto. Deve lasciare sfondo fotografico continuo e tranquillo in quelle zone, collocando il soggetto nella zona prevista; non deve aggiungere scritte, marchi o pannelli alla fotografia. Non viene effettuata una chiamata separata per posizionare il logo. Original usa la foto caricata, con lo stesso template. Le posizioni applicate dall’app sono fisse; il rispetto delle zone da parte del soggetto generato richiede un controllo visivo. Su foto esistenti occorre scegliere uno schema compatibile e verificare il ritaglio.
- La pulizia del logo elimina il fondo uniforme bianco o nero collegato ai bordi, conserva i dettagli interni, ritaglia lo spazio trasparente e mantiene le proporzioni. È selezionabile dal Profilo, con anteprima. Il logo rispetta il proprio ancoraggio anche quando è molto largo o verticale. La scelta automatica valuta la fotografia sotto il logo, considera la trasparenza del marchio e preferisce il logo a colori quando è leggibile. Se necessario viene applicata una correzione chiara o scura al fondo, con bordi sfumati; il logo non viene ricolorato. Un contrasto ancora insufficiente viene segnalato sotto la foto senza bloccare anteprima, ritocco ed esportazione. File mancanti o vuoti dopo la pulizia restano errori da correggere. Per marchi complessi usare il file trasparente originale: la pulizia conservativa non sostituisce uno scontorno professionale.
- I font inclusi sono Bricolage Grotesque e DM Sans, distribuiti con le licenze OFL in public/fonts. Si possono caricare file WOFF2, WOFF, TTF e OTF fino a 5 MB: sono privati e devono essere caricati correttamente dal browser prima dell’esportazione. I quattro HEX restano memorizzati. Sulla fotografia il testo usa un colore leggibile della palette oppure bianco o nero; soltanto quando necessario viene corretta la luminosità del fondo sotto il testo, con bordi sfumati e mantenendo visibile la foto. Il contrasto è misurato su campioni del fondo: non costituisce un’analisi semantica degli oggetti.
- Durante la generazione compare un modale responsive con indicatore di attesa, messaggi a rotazione su Sodano Consulting e collegamento a https://sodanoconsulting.it/. Mostra lo stato reale della richiesta e della composizione del logo, senza percentuali simulate. Può essere ridotto e riaperto, resta disponibile durante il cambio di sezione e si chiude al termine o in caso di errore. La fascia con loader e comando per ridurre la finestra resta fissa; sugli schermi bassi il contenuto scorre sotto, senza passare dietro al pulsante. Il link apre il sito separatamente, mantenendo ClickSocial aperto; animazioni e scorrimento rispettano le preferenze di movimento ridotto e lo spazio disponibile sul dispositivo.
- Foto dal dispositivo o dalla fotocamera, anteprima dello scatto e possibilità di rifarlo prima del caricamento.
- Studio con pulsanti per le modalità, avatar solo per il tono di voce, filtri, titolo sulla foto e modifica manuale di caption e hashtag. Anteprima e foto esportata usano lo stesso disegno.
- Input, aree di testo e menu mantengono caratteri di almeno 16 pixel sui piccoli schermi e sui dispositivi touch, anche in orizzontale e nei modali. Questo evita il tipico zoom di Safari sui campi piccoli senza disabilitare lo zoom manuale. I campi e i gruppi del modulo possono restringersi; le aree di testo si ridimensionano solo in verticale. I filtri rapidi passano a due colonne sugli schermi piccoli, lasciando spazio anche al nome Drammatico.
- Le scrollbar sono nascoste nella pagina, nei campi e nei modali; resta disponibile lo scorrimento con tocco, rotella e tastiera. I controlli nativi seguono il tema chiaro o scuro dell’app.
- Titolo e testo di supporto vengono misurati con i font effettivi, disposti su righe equilibrate e adattati allo spazio disponibile. Il testo troppo lungo blocca l’esportazione con un messaggio: occorre accorciarlo o cambiare template. Modificare testi, formato, template o ritaglio non genera nuove chiamate AI.
- I post precedenti conservano la loro composizione. Lo Studio offre un’azione esplicita per applicare un template alla foto originale; i testi già disegnati nelle vecchie immagini AI non vengono estratti. La rigenerazione senza conversione mantiene il flusso precedente, inclusa l’analisi del posizionamento del logo.
- Le sei barre di regolazione partono bloccate. Premi una barra per sbloccarla senza cambiarne il valore, poi regolala; il lucchetto la blocca di nuovo. Cambiando foto o riaprendo lo Studio le barre tornano bloccate, conservando i valori della bozza o del post. I filtri rapidi restano disponibili nei post modificabili.
- Bozze conservate durante il cambio di sezione. Prima di ricaricare o chiudere la pagina occorre salvare.
- Libreria con Agenda (iniziale su mobile), Calendario, Tutti i post, Bozze editoriali e Da pianificare; ricerca e filtri per piattaforma e preparazione. Una bozza richiede soltanto l’argomento: può contenere obiettivo, scatti da preparare, data shooting, testo provvisorio, note, social, template, formato e data prevista, anche senza foto e senza consumi AI.
- «Genera dalla bozza» recupera il brief nello Studio e permette di caricare la foto dopo lo shooting. Il salvataggio aggiorna lo stesso contenuto: conserva il collegamento con il brief e la data editoriale. Il caricamento della foto porta la preparazione a Materiale disponibile; l’esportazione salvata indica Post creato. Una bozza senza immagine finale non può essere inviata o segnata come pubblicata.
- Riapertura con filtri conservati. Le schede mostrano modifica e pianificazione; il menu Altre azioni raccoglie copia, download unico ZIP con immagine e testo, cancellazione e registrazione della pubblicazione manuale.
- Guida contestuale avviata dal pulsante Guida, che si chiude al cambio pagina e all’apertura di una finestra di lavoro.
- Area azienda con utenti e piani e sezione Sviluppatore con registro delle chiamate AI e stime dei costi. Le icone edificio e codice sono nella navigazione degli amministratori, anche su mobile. Guida, tema e azioni dell’intestazione hanno icone con nomi accessibili; la guida individua il collegamento effettivamente visibile.
- Sviluppatore calcola automaticamente le stime in USD per generazione e cliente, includendo testo, immagini, analisi del logo e test di connessione. Il backend salva consumi, modello, livello di servizio e tariffe applicate; i vecchi prezzi medi nel browser non vengono più usati. Il riepilogo riguarda le ultime 500 operazioni registrate, non l’intero account OpenAI. Quando la cache non è comunicata compare un intervallo; con consumi mancanti compare un subtotale esplicito. Gli errori non cancellano i consumi delle fasi già eseguite.

Ogni libreria mostra solo i contenuti del proprio account, anche per gli amministratori. Gli amministratori gestiscono gli utenti e i piani e leggono conteggi e registri dell’installazione. Le immagini caricate richiedono una sessione autorizzata; l’amministratore conserva l’accesso amministrativo ai file.

Una data editoriale è un promemoria: non avvia un invio ai social. «Pubblica foto» apre anteprima, testo, destinazione e conferma; permette un invio immediato o programmato con Pro. «Segna come pubblicato» registra una pubblicazione già eseguita personalmente. I collegamenti e i requisiti del gestore sono descritti in [SOCIAL.md](SOCIAL.md).

La fotocamera parte solo dopo «Attiva fotocamera» e il consenso del browser. Lo scatto rimane in anteprima fino a «Usa foto»; chiusura della finestra e passaggio in secondo piano fermano lo stream. Se necessario è disponibile anche la fotocamera nativa del dispositivo. La prova con una fotocamera fisica resta da effettuare.

## Servizi da configurare

Alla prima installazione copia `.env.example` in `.env`, inserisci le credenziali dei tuoi servizi e riavvia l'app. Se `.env` esiste già, modifica solo le impostazioni necessarie. Il file resta sul server e non viene incluso nell'interfaccia compilata.

| Servizio | Configurazione | Funzione |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY`, `AI_TEXT_MODEL=gpt-5.6-luna` | Foto e brief nella stessa richiesta per titolo, testo grafico, caption e hashtag; analisi del logo soltanto nel flusso precedente senza template. |
| Immagini AI | Anche `AI_IMAGE_MODEL=gpt-image-2` | Modalità Enhance e Creative tramite modifica immagini. |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Accesso Google. Callback locale: `http://127.0.0.1:5180/api/oauth/google/callback`. Per collegare un account con password già esistente, accedi prima e usa il pulsante nel Profilo. |
| Facebook | `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`, eventuale `META_LOGIN_CONFIG_ID` | Pagine Facebook; callback `/api/social/facebook/callback`. |
| Instagram | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `META_GRAPH_VERSION` | Instagram Login per account professionali; callback `/api/social/instagram/callback`. |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Login Kit e Direct Post foto; callback `/api/social/tiktok/callback`. Serve verificare il dominio delle immagini. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Checkout in abbonamento e conferma del piano tramite `/api/stripe/webhook`. Il prezzo è quello del tuo account Stripe. In locale il webhook necessita di un inoltro, ad esempio tramite Stripe CLI. |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, eventuali credenziali e `MAIL_FROM` | Invio effettivo delle email al posto della posta locale. |

Le integrazioni usano direttamente i rispettivi servizi. La precedente configurazione OpenAI è stata verificata con generazioni reali nelle tre modalità. La configurazione attuale Luna con Image 2 è stata verificata con risposte simulate: disponibilità sull’account e qualità di testi e analisi del logo richiedono una prova reale. Google, Meta, Stripe e SMTP richiedono ancora configurazione e prova con gli account effettivi; i relativi test automatici usano risposte esplicitamente di collaudo. Per i social, configurazione e callback esatti sono in [SOCIAL.md](SOCIAL.md); le variabili degli altri servizi sono elencate in `.env.example` e nella tabella precedente.

Per contenere i consumi, Luna usa reasoning `none` per il post (massimo 1200 token di output) e il controllo di connessione (32), e `low` per l’analisi del logo dei post senza template (8000, inclusi i token di ragionamento). Le richieste Responses usano il livello Standard (`service_tier: default`); non ci sono tentativi automatici con modelli più costosi. Una risposta incompleta interrompe la generazione e ne conserva i consumi nel registro. Con i template Original usa una richiesta di testo; Enhance e Creative aggiungono una richiesta Image 2. La fotografia richiesta a Image 2 è di circa un megapixel e segue le proporzioni dell’area fotografica, con dimensioni multiple di 16; il formato finale viene composto localmente. Il flusso precedente resta a 1024 × 1024. Il listino include [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) e i suoi prezzi per contesti lunghi; supplementi cache non quantificabili sono segnalati come stima parziale.

Template, versione, formato, ritaglio e una copia dell’identità grafica sono memorizzati nel post. Cambiare il Profilo non altera i contenuti esistenti: nello Studio si può scegliere «Usa le impostazioni aziendali aggiornate». Per modificare i layout in shared/templates.mjs dopo il rilascio, aggiungere una nuova versione e conservare le precedenti. Bozze e identità usano i campi JSON già presenti su SQLite e MySQL, senza una migrazione dello schema. Anche i font caricati sono in data/uploads e devono essere inclusi nel backup.

Le impostazioni OpenAI si leggono da `.env` all’avvio del backend: dopo una modifica occorre riavviarlo. Gli avatar inclusi nell’interfaccia sono asset statici generati durante lo sviluppo e non consumano chiamate AI mentre usi l’app.

L'app mantiene la regola originale delle due generazioni AI per gli account Free; Pro rimuove il limite applicativo. Le chiamate vengono comunque addebitate dal fornitore AI al titolare della chiave. Le stime economiche nella pagina Sviluppatore usano i consumi restituiti dall’API e il listino registrato dal backend; non sono una fattura del fornitore.

L’invio automatico delle singole foto comprende Pagine Facebook, Instagram professionale e TikTok, con piano Pro e servizi attivati. Il backend controlla la coda ogni 30 secondi; Instagram e TikTok richiedono anche l’attesa dell’esito remoto. Un timeout durante un invio che potrebbe essere già avvenuto produce «Esito da verificare», senza reinviare automaticamente. La Libreria permette di registrare l’esito dopo aver controllato il social. I test isolati non attestano approvazioni delle app aziendali o pubblicazioni reali. La configurazione di collaudo `AVVIA-MOBILE.cmd` mantiene lo scheduler disattivato.

## Dati e portabilità

Il backend supporta SQLite e MySQL/MariaDB. `DB_DRIVER` in `.env` sceglie il motore; le variabili `MYSQL_*` configurano la connessione. I comandi di controllo e migrazione sono elencati sotto. Il trasferimento conserva password, ruoli, piani, post, date, sessioni e riferimenti alle immagini, e rifiuta una destinazione già popolata.

Con SQLite, `data/clicksocial.sqlite` contiene il database. Con MySQL i dati sono nel servizio SQL e vanno esportati anche da lì per il backup: copiare soltanto `data` non basta. Con entrambi i motori servono `data/uploads/` per le immagini e `data/.encryption-key` per i dati cifrati. Per un backup coerente ferma l'app, conserva il database attivo, la cartella `data` e `.env`. Non avviare contemporaneamente copie sincronizzate da OneDrive su più computer. Il vecchio SQLite conservato dopo una migrazione non riceve le modifiche successive fatte su MySQL.

Lo ZIP originale non conteneva un'esportazione degli account, dei post del database remoto o dei file privati degli utenti. Questi dati non sono stati importati. Un'eventuale migrazione dei dati esistenti richiede un'esportazione separata; le password gestite da Base44 non sono recuperabili dal codice del progetto.

L’avvio locale usa il bind su `127.0.0.1`. La posta locale è leggibile da chi accede al computer. L’avvio pubblico richiede HTTPS, SMTP, credenziali e callback dei servizi secondo [PLESK.md](PLESK.md); `npm run local` forza intenzionalmente l'avvio locale. `app.cjs` imposta la modalità production e rifiuta `LOCAL_MODE=true`. Il modello `.env.production.example` contiene soltanto segnaposto, da completare privatamente sul server.

Con Passenger imposta `PROXY_MODE=passenger`: i limiti di accesso usano l’header protetto del server, senza fidarsi di `X-Forwarded-For`. I limiti delle operazioni autenticate sono separati per utente. `SCHEDULER_ENABLED=false` disattiva il controllo periodico e quello all’avvio; per elaborare comunque la coda serve un’attività pianificata `npm run scheduler:run`. Questa operazione può pubblicare realmente i contenuti già autorizzati presenti nella coda.

## Sviluppo e verifiche

- `npm test`: flussi del backend, permessi, persistenza e integrazioni con risposte di collaudo su SQLite isolato.
- `npm run test:mysql`: stessi flussi e migrazione su un server SQL temporaneo; `MYSQL_TEST_SERVER` indica il percorso di `mysqld`, se non è nel PATH. Non usa il database configurato in `.env`.
- `npm run test:social-ui`: dopo la compilazione, verifica i flussi social e le guide in un browser headless isolato; requisiti e risultati in [SOCIAL.md](SOCIAL.md).
- `npm run db:check:mysql`: verifica della connessione indicata in `.env`, senza modificare il database.
- `npm run db:migrate:mysql`: controllo preliminare del trasferimento SQLite-MySQL, senza copiare dati. L'esecuzione richiede `-- --apply` e l'app ferma.
- `npm run typecheck` e `npm run lint`: controlli sul codice.
- `npm run build`: compilazione dell'interfaccia.
- `npm audit`: vulnerabilità note delle dipendenze.
- `npm run deploy:package`: dopo una compilazione aggiornata crea lo ZIP web privo di credenziali, dati e istruzioni per assistenti; non pubblica nulla.
- `npm run admin:grant -- EMAIL`: controlla un account verificato; `--apply` assegna esplicitamente il ruolo amministratore senza modificare password o piano. Non serve se l’amministratore viene importato dal database esistente.
- `npm run dev`: frontend Vite su 5180 e backend su 8787, in un ambiente che consenta la scansione delle dipendenze di Vite. In questo ambiente desktop la compilazione seguita da avvio locale evita una limitazione di accesso alle cartelle dell'ottimizzatore.

Il codice esportato legato a Base44 è conservato soltanto come riferimento in `work/original-base44/` e non viene eseguito. `work/` contiene anche cache, prove e registri; non serve per eseguire l'app. `package-lock.json` registra le versioni delle dipendenze.

I risultati delle verifiche social e i limiti residui sono in [SOCIAL.md](SOCIAL.md) e nella [guida d’uso](GUIDA.md). Il comando locale `node scripts/provision-admin.mjs admin@sodanoconsulting.it` è idempotente: conserva le password esistenti e prepara un link locale solo quando manca una password. È riservato all’installazione locale senza SMTP.
