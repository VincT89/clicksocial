# ClickSocial su Plesk

Preparazione aggiornata al 29 ottobre 2026. La procedura riguarda il sito React e il backend Node.js su Plesk per Linux con Passenger. Sottodominio, versioni e permessi dell’hosting devono essere confermati dal tutor prima del caricamento. Il codice è predisposto per questo ambiente; il funzionamento sul server reale va ancora verificato.

## Cosa chiedere al tutor

Servono il sottodominio completo, l’accesso Plesk alla sua scheda e queste informazioni, senza condividere password in chat:

- Node.js Toolkit abilitato e Node **24.22.1 o una versione 24 successiva con le correzioni di sicurezza** disponibile per quella specifica applicazione. Controllare anche la versione usata dalle attività pianificate e dal terminale: può essere diversa da quella del pannello.
- Plesk per Linux, Passenger e possibilità di scegliere Application Root, Document Root e Application Startup File. Se il servizio è Windows o usa un altro sistema di avvio, adattare la procedura prima di proseguire.
- Database MySQL/MariaDB dedicato, versione completa, host, porta e utente con permessi limitati a quel database. Se è remoto, chiedere TLS e certificato CA. Il collaudo locale MySQL non certifica automaticamente una diversa versione MariaDB dell’hosting.
- Invio SMTP con mittente autorizzato, host, porta e modalità TLS.
- Certificato HTTPS valido, accesso SFTP o File Manager, possibilità di eseguire `npm ci` e comandi Node. Chiedere il percorso effettivo del binario Node se si usa SSH o un’attività pianificata.
- Un processo sempre attivo oppure attività pianificate ogni minuto, anche senza visitatori. Chiedere backup, spazio disponibile e limiti di memoria/processi dell’account.

React viene già compilato nel pacchetto: non è un secondo servizio da installare o tenere acceso. PHP, Laravel, Composer e Caddy non sono necessari per eseguire questa applicazione su Plesk. Il tutor gestisce nginx/Apache e HTTPS attraverso l’hosting.

## Pacchetto e dati sono due trasferimenti distinti

Il comando `npm run deploy:package`, eseguito dopo una nuova compilazione, genera `work/deploy/release-.../ClickSocial-Plesk.zip`. Include l’interfaccia `dist`, il backend, `shared`, `src`, gli strumenti e questa guida, con un elenco SHA-256 dei file. `src` serve anche al backend: alcuni moduli sono condivisi e non vanno eliminati.

Il pacchetto esclude `.env`, database, file caricati dagli utenti, chiavi di cifratura, dipendenze installate, Git, cache e istruzioni destinate agli assistenti. Non è un backup dei dati. Non comprimere tutta la cartella APP e non caricare `node_modules` da Windows.

L’installazione locale analizzata usa **MySQL**. Per ritrovare utenti, password, piani, post e immagini servono insieme:

- esportazione SQL del database MySQL attivo;
- cartella `data/uploads`, inclusi i font caricati;
- file nascosto `data/.encryption-key`, mantenuto identico;
- credenziali dei servizi da configurare privatamente sul server.

Il vecchio `data/clicksocial.sqlite` non è la copia aggiornata del database MySQL. Non usare `db:migrate:mysql` per trasferire da MySQL a MySQL: quel comando serve soltanto per SQLite verso un database MySQL vuoto. Vedi [MYSQL.md](MYSQL.md).

## Caricamento iniziale

### Alternativa tramite GitHub

Il repository è `https://github.com/VincT89/clicksocial.git`; il ramo di lavoro verificato è **`main_vincenzo`**. Il repository comprende anche i sorgenti iOS e Android necessari alle build mobili. Il sito usa `app.cjs`, backend e interfaccia web; non serve rimuovere i progetti nativi da Git.

Con l’estensione Git di Plesk, collega il repository, scegli esplicitamente il ramo e usa inizialmente la distribuzione **manuale** in una nuova cartella privata. Per un repository privato usa l’indirizzo SSH `git@github.com:VincT89/clicksocial.git` e registra su GitHub la chiave pubblica generata da Plesk, con accesso di sola lettura. Non inserire token nell’URL. La [documentazione Plesk per Git remoto](https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/git-support/using-remote-git-hosting.75848/) descrive collegamento, selezione del ramo e distribuzione.

`dist` è esclusa da Git: il solo scaricamento del repository non produce un’app avviabile. Nella nuova cartella privata, usando il Node previsto per il sito, esegui:

```sh
npm ci --include=dev
npm run lint
npm run typecheck
npm run build
npm prune --omit=dev
```

Questi comandi preparano la copia appena scaricata. Esegui i test su una copia isolata senza `.env` e dati reali. Le variabili `VITE_*` entrano nell’interfaccia pubblica: nessun segreto e nessun indirizzo Wi-Fi del PC. Per la compilazione web lascia non impostate le variabili `VITE_MOBILE_*`; l’app usa `/api` sul proprio dominio.

Prima di abilitare l’app configura database, SMTP, `APP_ORIGIN` e dati persistenti come descritto sotto. Per ogni rilascio annota il commit distribuito e conserva una copia del rilascio precedente. Mantieni `DATA_DIR` fuori dalla cartella aggiornata da Git. La distribuzione manuale evita che un push aggiorni il sito prima della compilazione e dei controlli.

### Installazione del rilascio

1. **Apri la scheda del sottodominio corretto in Plesk.** Verifica DNS e certificato HTTPS. Non intervenire sul sito principale della società.
2. **Scegli una cartella privata per l’applicazione.** Esempio dimostrativo: una cartella `clicksocial` nella sottoscrizione. Carica ed estrai lo ZIP lì tramite File Manager o SFTP. Deve contenere direttamente `app.cjs`, `package.json`, `server`, `src` e `dist`, senza un livello aggiuntivo non previsto. Nessun altro dominio deve pubblicare questa cartella intera. Conserva gli archivi SQL e i backup fuori da tutte le cartelle pubbliche.
3. **Crea il database dedicato e il suo utente.** Per importare i dati locali lascia la destinazione vuota e l’app disabilitata fino a trasferimento concluso. Ferma brevemente l’app locale al momento del backup definitivo; esporta il MySQL attivo e copia uploads e chiave dalla stessa installazione. Importa l’SQL in Plesk/phpMyAdmin senza modificare gli hash delle password. Se ci sono già tabelle o dati sul server, fermati: occorre valutare la destinazione, non sovrascriverla.
4. **Configura i segreti solo sul server.** Per una nuova installazione usa `.env.production.example` come modello per un file privato `.env` nella radice dell’app, oppure inserisci le variabili nel pannello Node.js. Non caricare il `.env` locale invariato: contiene indirizzi e modalità del PC. Le variabili del processo hanno precedenza sul file; evita due configurazioni discordanti. Se `.env` esiste già, modifica solo i valori concordati.
5. **Controlla Node.js nel pannello.** Imposta Application Root sulla cartella che contiene `app.cjs`; Document Root sulla sua sottocartella **`dist`**; Application Mode su **Production**; Package Manager su **npm**; Application Startup File su **`app.cjs`**. Il backend viene caricato dal wrapper CommonJS con import dinamico, compatibile con il caricamento di Passenger. Non usare `npm start`, `npm run local`, `npm run dev` o `vite preview` per ospitare il sito.
6. **Installa le dipendenze nella radice dell’app**, usando il Node selezionato per il sito e il comando `npm ci --omit=dev`. Il pacchetto contiene già React compilato. Se Plesk offre solo “NPM Install”, chiedi come eseguire `npm ci` dal terminale o dal servizio: mantiene esattamente le versioni del lockfile. Non usare `--ignore-scripts` o aggiornamenti forzati per aggirare errori.
7. **Controlla la connessione SQL** con `npm run db:check:mysql`. Dopo un’importazione non eseguire comandi di migrazione o importazioni ripetute. Per un’installazione intenzionalmente vuota, dopo aver configurato `.env`, usa `npm run db:init:mysql`. Questo inizializza lo schema ClickSocial, senza creare un amministratore o una password.
8. **Abilita/riavvia l’applicazione nel pannello Node.js.** Leggi i log dell’app in caso di errore. Apri `https://SOTTODOMINIO_REALE/api/health`: deve rispondere con `ok: true`, `database: true` e `database_driver: "mysql"`. Sostituisci il segnaposto con il dominio effettivo, senza aggiungere le porte del PC.

I file `.env` e `.encryption-key` devono essere leggibili solo dall’utente del servizio e dagli amministratori autorizzati; `data/uploads` deve essere scrivibile da quell’utente. Non usare permessi `777` e non rendere pubblica la cartella `data`.

Per SMTP usa TLS immediato oppure STARTTLS. L’app interrompe l’invio se STARTTLS non è disponibile, prima di trasmettere credenziali o codici di accesso; non è previsto il ripiego su un collegamento in chiaro. Verifica host e modalità con il fornitore, senza disabilitare i controlli sul certificato. Il comportamento di `requireTLS` è documentato da [Nodemailer](https://nodemailer.com/smtp#tls-options).

## Valori da impostare

| Variabile | Valore sul server |
| --- | --- |
| `NODE_ENV` | `production`; anche il file di avvio `app.cjs` lo imposta. |
| `LOCAL_MODE` | `false`. In produzione la modalità locale viene rifiutata. |
| `APP_ORIGIN` | Il vero sottodominio con `https://`, senza credenziali, percorsi o parametri. |
| `DATA_DIR` | Cartella privata persistente con uploads e chiave; può essere un percorso assoluto fornito dal tutor. Va mantenuta tra i rilasci. |
| `PROXY_MODE` | `passenger` soltanto nell’avvio tramite Passenger. Il backend usa l’indirizzo protetto fornito da Passenger; ignora `X-Forwarded-For`. |
| `SCHEDULER_ENABLED` | `false` con l’attività pianificata descritta sotto; `true` se il tutor garantisce un processo sempre attivo. Scegliere un solo meccanismo ordinario. |
| `DB_DRIVER` | `mysql` per il trasferimento dell’installazione attuale. |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Dati effettivi del database Plesk, mai il nome utente root del server. |
| `MYSQL_SSL`, `MYSQL_SSL_CA` | Concordati con l’hosting; per SQL remoto usare TLS verificato con la CA prevista. Non disabilitare la verifica del certificato per risolvere un errore. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Dati forniti dal servizio email. `SMTP_SECURE=true` significa TLS immediato, tipicamente porta 465; porta 587 usa normalmente STARTTLS con `false`. Verificare con il fornitore. |
| `OPENAI_API_KEY`, `AI_TEXT_MODEL`, `AI_IMAGE_MODEL` | Credenziale privata e modelli abilitati sul proprio account. Le chiavi non vanno mai inserite in variabili `VITE_*` o nell’app iPhone. |

Non impostare una porta pubblica dedicata in Plesk: Passenger gestisce il collegamento al processo Node. La configurazione `PORT` serve agli avvii Node diretti; non aprire le porte 5180, 5181 o 8787 su Internet per questa procedura.

Se `PROXY_MODE=passenger` dà errore fuori da Plesk, non sostituirlo per tentativi con un proxy che accetti qualsiasi header. Verificare prima il sistema di avvio. Per un server Node diretto senza proxy si usa `none`; un’architettura con un proxy diverso richiede una configurazione specifica. Se davanti a Plesk c’è anche una CDN, il tutor deve verificare quale indirizzo arrivi tramite l’header protetto. I limiti applicativi restano in memoria per processo: configurazioni con più processi richiedono anche protezioni concordate a livello di proxy o un limite condiviso.

## Pubblicazioni programmate quando nessuno visita il sito

Passenger può sospendere i processi inutilizzati. Il solo pulsante “Abilita Node.js” non garantisce che una foto programmata venga inviata a sito inattivo.

Per l’opzione con attività pianificate, configura `SCHEDULER_ENABLED=false` e fai creare al tutor un’attività ogni minuto, eseguita con lo stesso utente, database, chiave e configurazione dell’app. Il comando applicativo è:

```sh
node scripts/publish-due.mjs
```

Il comando apre il database, elabora la coda già autorizzata dall’utente e termina; non apre un server HTTP. Non è una prova innocua se il database contiene invii reali in attesa. Usa gli stessi blocchi della coda web. La frequenza ogni minuto introduce un’attesa fino al controllo successivo, oltre ai tempi del social.

Il tutor deve usare il **percorso assoluto del Node corretto**, la directory dell’app e le sue variabili: l’attività pianificata non eredita necessariamente le variabili del pannello Node.js. Se i valori sono solo nel pannello, vanno forniti al processo pianificato mediante una configurazione privata; non scrivere segreti nel comando o nei log. È preferibile usare un blocco di processo per evitare sovrapposizioni.

Esempio dimostrativo per Linux, da adattare ai percorsi reali e solo se `flock` è disponibile:

```sh
cd '/PERCORSO_PRIVATO_APP' && mkdir -p work && flock -n work/publish.lock '/PERCORSO_NODE/node' scripts/publish-due.mjs
```

Non copiare letteralmente i segnaposto. Conflitti, timeout o invii dall’esito incerto vanno controllati nella Libreria: un comando terminato correttamente non certifica la pubblicazione di ogni singolo post. In alternativa il tutor può mantenere un processo sempre attivo con `SCHEDULER_ENABLED=true`, includendo riavvio dopo guasti e avvio dopo reboot.

## Amministratore e primo accesso

Importando il database locale conservi account, hash delle password, ruoli e piani. Accedi con l’account già presente: non usare hash Laravel/Tinker e non modificare la password da phpMyAdmin.

Su un database nuovo, configura prima SMTP, registrati dal sito e completa la verifica email. In produzione il primo iscritto **non** diventa amministratore automaticamente. L’operatore del server può controllare un account con:

```sh
npm run admin:grant -- INDIRIZZO_EMAIL_REALE
```

Verificato il destinatario, la conferma esplicita è:

```sh
npm run admin:grant -- INDIRIZZO_EMAIL_REALE --apply
```

Il comando richiede un account già verificato e cambia solo il ruolo: non crea password, non modifica il piano e non invia email. Il piano di prova si può poi gestire dall’area amministrativa. Non serve Stripe per provare l’app con account autorizzati dal gestore.

## Collaudo sul dominio reale

Prima di invitare il capo, verifica dal browser, anche su telefono e rete mobile:

- Home, login, logout e ricaricamento diretto di `/profilo` e `/library` senza errori del web server.
- Registrazione, ricezione del codice, verifica e recupero password tramite SMTP reale.
- Immagini e font già importati, caricamento nuovo, salvataggio e riapertura di una bozza, download della grafica.
- Assenza di accesso ai file di un altro utente; nessuna esposizione di `.env`, chiave, dump SQL o cartelle del progetto. `/dev/mail` deve restare indisponibile.
- Generazione AI con credenziali e modelli reali, previa autorizzazione ai relativi costi. Gli errori del fornitore non si risolvono disattivando TLS o esponendo chiavi nel browser.
- Più utenti senza blocco collettivo dei tentativi: il tutor deve verificare l’indirizzo visitatore ricevuto da Passenger.
- Pianificazione e controllo esito dopo un periodo senza visite e dopo il riavvio del servizio. La pubblicazione reale richiede consenso e account di prova concordati.

Le richieste di generazione possono comprendere più chiamate AI consecutive, ciascuna con timeout fino a 120 secondi. Il tutor deve verificare i timeout di nginx/Apache/Passenger e i limiti del piano rispetto a una generazione completa; aumentare solo il timeout del processo Node non risolve un 504 del proxy. Gli upload accettati dall’app arrivano a 15 MB per immagine e 5 MB per font: anche il web server deve consentire questi limiti.

I controlli automatici locali non sono una prova di carico con 100 persone contemporanee. Prima di un uso esteso servono prova di carico, limiti dei consumi AI, monitoraggio di memoria/spazio, backup con ripristino provato e controllo dei permessi dell’hosting. Il piano Pro rimuove il limite applicativo alle generazioni; i costi del fornitore continuano ad applicarsi.

## Social, Google e pagamenti

I clienti autorizzano gli account attraverso l’app aziendale del gestore. Configurare solo le chiavi nel server non sostituisce verifiche, permessi e approvazioni di Meta/TikTok. Per procedure e limitazioni consulta [SOCIAL.md](SOCIAL.md).

Usa il vero `APP_ORIGIN` come prefisso di questi percorsi:

| Servizio | Percorso |
| --- | --- |
| Facebook | `/api/social/facebook/callback` |
| Instagram | `/api/social/instagram/callback` |
| TikTok | `/api/social/tiktok/callback` |
| Google, facoltativo | `/api/oauth/google/callback` |
| Stripe, facoltativo | `/api/stripe/webhook` |

TikTok richiede anche la verifica del dominio/prefisso delle immagini secondo il prodotto attivato. Il percorso delle foto autorizzate è `/api/social/media/`; non esporre `data/uploads` per aggirare la verifica. Predisporre URL pubblici reali per privacy, condizioni ed eventuali istruzioni di eliminazione dati richiesti dalle piattaforme, usando testi approvati dalla società. Il pacchetto non inventa documenti legali.

## Passare l’iPhone al server

Dopo il collaudo web, imposta nelle variabili del workflow Codemagic:

```text
MOBILE_API_ORIGIN=https://SOTTODOMINIO_REALE
MOBILE_LOCAL_TEST=false
```

Ricompila e distribuisci la nuova build TestFlight seguendo [IOS-CODEMAGIC.md](IOS-CODEMAGIC.md). La vecchia build che punta a un IP privato continua a cercare il PC finché non viene sostituita. Verifica anche il ritorno in app dopo il consenso social. Il server è indipendente dal computer solo dopo aver trasferito effettivamente backend e dati sul dominio.

## Aggiornamenti e ripristino

Conserva per ogni rilascio codice, lockfile e `dist` corrispondenti. Salva un backup coerente del database attivo, uploads, chiave e configurazione prima di aggiornare. Ferma web e attività pianificate durante un trasferimento definitivo; non lasciare entrambe le installazioni a inviare i medesimi post copiati.

Carica una nuova cartella privata, installa con `npm ci --omit=dev`, verifica la configurazione e cambia Application Root/Document Root insieme. Mantieni la directory dati persistente. Se ricompili sul server servono prima `npm ci --include=dev` e `npm run build`; non ricompilare mentre l’istanza in uso sta servendo una cartella `dist` parzialmente aggiornata.

Per tornare al rilascio precedente riporta entrambe le radici alla stessa versione e riavvia. Non ripristinare automaticamente un vecchio database sopra dati nuovi: occorre valutare le scritture avvenute e l’eventuale migrazione di schema. I cambiamenti di preparazione Plesk non introducono uno schema SQL nuovo.

## Verifiche locali del pacchetto

Controlli eseguiti il 29 ottobre 2026 su copie isolate Windows, con Node 24.22.1, senza usare credenziali o dati reali:

| Controllo | Risultato |
| --- | --- |
| Controllo del codice, dei tipi e compilazione React | Superati. |
| Test con SQLite | 107 superati; esclusi il test specifico MySQL e la creazione di collegamenti non consentita dall’ambiente Windows. |
| Test con server MySQL temporaneo | 108 superati; esclusa solo la creazione di collegamenti non consentita dall’ambiente Windows. |
| Installazione dei file di rilascio con `npm ci --omit=dev` | Superata, senza dipendenze di sviluppo e senza cartelle copiate da Windows. |
| Avvio di produzione | Verificati avvio, accesso, cookie sicuri, pagine dirette, protezione dei file privati e disattivazione della posta locale. |
| Flussi social e interfaccia | Verificati con servizi simulati, inclusi annullamento, errori, nuovo tentativo e conferma. Controllate cinque dimensioni dello schermo, da 320 a 1280 pixel di larghezza. |
| Dipendenze con `npm audit` | Nessuna vulnerabilità nota segnalata dal registro al momento del controllo. |
| Protezione SMTP | Verificato il rifiuto di un server di prova senza TLS, prima dell’invio di credenziali o messaggi. |
| Esclusioni del rilascio | Verificati file privati annidati, backup, nomi riservati e conservazione dei sorgenti necessari. La prova dei collegamenti simbolici richiede un ambiente che ne consenta la creazione. |

Il controllo dei file candidati a Git comprende nomi sensibili, firme comuni di credenziali e confronto con il segreto locale configurato, senza copiarlo nel collaudo. Non sono emerse credenziali reali nei file candidati; due URL fittizi nei test sono stati riconosciuti e verificati come tali. Il controllo non riscrive né certifica l’intera cronologia precedente del repository.

Questi risultati non sostituiscono il collaudo di Linux/Passenger sul Plesk reale, del suo database, di SMTP, delle API AI e dei social autorizzati. Non sono stati eseguiti test di carico con 100 utenti contemporanei né una nuova build iPhone. L’assenza di segnalazioni in `npm audit` non dimostra che l’intero progetto sia privo di vulnerabilità.

## Riferimenti verificati

- [Plesk: configurazione e avvio Node.js](https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/nodejs-support.76652/).
- [Plesk: wrapper CommonJS per applicazioni ESM](https://support.plesk.com/hc/en-us/articles/12389037025431-A-Node-js-app-hosted-in-Plesk-is-not-working-require-of-ES-Module-is-not-supported).
- [Passenger: header protetti e indirizzo del client](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/secure_http_headers.html).
- [Passenger: gestione dei processi](https://www.phusionpassenger.com/docs/advanced_guides/config_and_optimization/nginx/dynamic_scaling_vs_fixed_app_processes/node/).
- [Node.js: correzioni di sicurezza di ottobre 2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
