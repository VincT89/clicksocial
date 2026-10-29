# Collegamenti social della società

Aggiornamento del 23 settembre 2026. L’app sviluppatore appartiene alla società che offre ClickSocial. Ogni cliente autorizza i propri account; i token sono conservati cifrati sul backend e non sono condivisi tra clienti. Nessuna credenziale reale viene fornita o modificata da questo documento.

## Configurazione del gestore

Serve un backend pubblico HTTPS sempre disponibile, con `APP_ORIGIN` uguale alla sua origine (protocollo, dominio, eventuale porta, senza percorsi). Il dominio deve essere quello reale scelto dal gestore: qui non ne viene inventato uno. `LOCAL_MODE=false`, database, immagini persistenti, chiave di cifratura, backup ed email vanno configurati prima del servizio ai clienti. Il solo hosting della parte web non esegue il backend.

Le variabili nuove sono elencate in `.env.example`. Vanno inserite soltanto nel `.env` del backend, mai nel frontend, in variabili `VITE_*`, nei post o nella build iPhone.

| Servizio | Credenziali della società | Callback da registrare, preceduto da APP_ORIGIN |
| --- | --- | --- |
| Facebook Pages | `META_APP_ID`, `META_APP_SECRET`; `META_LOGIN_CONFIG_ID` se si usa la configurazione Facebook Login for Business | `/api/social/facebook/callback` |
| Instagram Login | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` dal prodotto Instagram dell’app Meta; non presumere che coincidano con quelli Facebook | `/api/social/instagram/callback` |
| TikTok Login Kit e Content Posting API | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | `/api/social/tiktok/callback` |

Il percorso precedente `/api/oauth/facebook/callback` resta compatibile con le vecchie versioni web. Le nuove versioni usano i callback della tabella. Il collegamento Google non cambia.

Facebook richiede `pages_show_list`, `pages_read_engagement` e `pages_manage_posts`. Se si imposta `META_LOGIN_CONFIG_ID`, la configurazione aziendale deve includere questi permessi. Il cliente deve concedere l’accesso alle Pagine e avere il compito di pubblicarvi.

Instagram usa il prodotto **Instagram API with Instagram Login**, per account professionali Business o Creator, con `instagram_business_basic` e `instagram_business_content_publish`. Questo percorso non richiede una Pagina Facebook collegata. Gli access token a lunga durata vengono rinnovati quando prossimi alla scadenza, se ancora rinnovabili; altrimenti l’interfaccia richiede il nuovo consenso.

TikTok richiede `user.info.basic` e `video.publish`. Le foto vengono inviate con Direct Post, non come semplice bozza nella casella TikTok. Il dominio o prefisso URL `APP_ORIGIN/api/social/media/` deve essere verificato nelle proprietà URL dell’app TikTok. Gli access token sono rinnovati dal backend usando il refresh token.

La società deve completare la configurazione dei prodotti, degli URL, delle informazioni richieste nei portali e delle revisioni necessarie per servire clienti esterni. Aggiungere le chiavi non dimostra di avere ottenuto l’approvazione. Prima dell’audit, TikTok impone restrizioni ai test e alla visibilità. I permessi effettivi vanno verificati negli account aziendali; questo aggiornamento non cambia i portali Meta o TikTok.

Riferimenti del fornitore: [Instagram Login, raccolta ufficiale Meta](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login), [TikTok Login Kit Web](https://developers.tiktok.com/docs/en/login-kit-web), [TikTok Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-get-started), [requisiti dell’esperienza di condivisione](https://developers.tiktok.com/docs/en/content-sharing-guidelines).

## Percorso del cliente

Dal Profilo il cliente sceglie un social, autorizza nel sito ufficiale, torna in ClickSocial e conferma gli account selezionati. Il tentativo è monouso, dura 15 minuti ed è legato al cliente che lo ha iniziato e al browser che ha aperto l’autorizzazione. Il backend non sovrascrive un collegamento precedente prima della conferma finale. Rifiuti, permessi mancanti e scadenze producono messaggi nell’interfaccia.

La conferma può essere completata nella finestra di ritorno o nella scheda iniziale: le altre finestre rileggono l’esito al ritorno in primo piano o al controllo successivo. Il server conserva per 15 minuti una ricevuta di conferma o annullamento, leggibile soltanto dal cliente proprietario e priva di token, credenziali e account candidati. La ricevuta non consente un secondo consenso. Un annullamento tardivo non rimuove un collegamento già confermato; una risposta del social arrivata dopo l’annullamento non riapre il tentativo.

Un errore durante la conferma resta visibile anche durante gli aggiornamenti automatici o dopo **Verifica collegamenti**; viene rimosso quando il cliente riprova, annulla o il server conferma la conclusione del tentativo. Se la finestra viene bloccata compare **Apri autorizzazione**. Alla scadenza il tentativo viene liberato e lo stato degli account riletto: è possibile premere nuovamente **Collega** o **Ricollega** senza cancellare i collegamenti esistenti.

Su iPhone e Android l’autorizzazione si apre nel browser di sistema. Il link `it.sodanoconsulting.clicksocial://social-return` riporta al Profilo con il solo identificativo del tentativo: non contiene sessioni o token social. La conferma richiede comunque la sessione autenticata del cliente nell’app. La pagina finale consente anche di tornare manualmente all’app.

Il nuovo schema URL è registrato nei sorgenti iOS e Android. Serve ricompilare l’app per renderlo disponibile sui telefoni. I collegamenti non diventano operativi nella vecchia build TestFlight 1.0 (5) aggiornando soltanto il server. Il target mobile di produzione deve usare il backend HTTPS pubblico, con `MOBILE_LOCAL_TEST=false`.

## Foto, coda ed esiti

Il cliente usa **Pubblica foto** dalla Libreria, controlla anteprima, account e testo, sceglie invio immediato o data futura e conferma. Serve Pro, come per la precedente programmazione Facebook. Un post appartiene a un solo social. Download e pubblicazione manuale restano disponibili; video, Reel e caroselli non sono inclusi.

Per Instagram e TikTok il client prepara una copia JPEG dell’immagine salvata. Instagram accetta qui i formati quadrato, 4:5 e 16:9. Il file originale rimane invariato. I fornitori accedono alla sola copia scelta tramite un URL firmato, associato al cliente e al tentativo, valido per due ore. Gli altri file continuano a richiedere la sessione. Il gestore deve evitare che proxy, CDN o log applicativi rendano permanenti o diffondano questi URL; la risposta è `private, no-store`.

La coda è salvata nei dati JSON del post. Con `SCHEDULER_ENABLED=true` il backend controlla ogni 30 secondi e acquisisce ogni invio con confronto atomico della versione del post. Su un hosting che sospende il processo senza visite si può usare `SCHEDULER_ENABLED=false` e un’attività pianificata che esegua `npm run scheduler:run`, come descritto in [PLESK.md](PLESK.md). Il riavvio conserva gli identificativi di elaborazione remoti; la scadenza del blocco temporaneo consente di riprendere i controlli senza inviare un’altra copia. Non viene promesso un orario esatto.

Facebook richiede la conferma del post creato. Instagram prepara e controlla il contenitore prima di pubblicarlo. TikTok restituisce inizialmente un identificativo di elaborazione; ClickSocial mostra Pubblicato solo dopo `PUBLISH_COMPLETE`. Il permalink è facoltativo: può non essere disponibile, soprattutto per post TikTok privati. Riferimenti: [foto TikTok](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post), [stato dell’invio TikTok](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status).

Un’interruzione in un momento in cui il post potrebbe essere già uscito produce **Esito da verificare sul social**. Non viene ritentato automaticamente. Il cliente controlla il profilo e dichiara se il post esiste. Anche un’elaborazione senza esito dopo 48 ore richiede verifica. Non si può modificare, cancellare o scollegare un contenuto con invio in corso o incerto. In questo stato è possibile rinnovare l’autorizzazione dello stesso account, ma non sostituirlo con un altro. Scollegare un provider cancella soltanto i suoi invii ancora in coda.

`AVVIA-MOBILE.cmd` disattiva lo scheduler per il collaudo locale. In produzione il processo backend deve essere supervisionato e lo scheduler attivo. La distribuzione VPS non è stata eseguita da questa modifica.

## Verifiche prima dei clienti

I test automatici usano database temporanei e risposte dei fornitori esplicitamente di collaudo: nessuna pubblicazione reale. Coprono consenso, replay, cliente sbagliato, flussi mobili senza sessione nel browser, separazione dei tre provider, rinnovo token tra richieste e istanze concorrenti, immagini private, concorrenza, errori ed esiti asincroni. I test precedenti su Google, calendario e Facebook restano attivi. Il 23 settembre sono passati 96 test SQLite e uno è stato escluso perché relativo alla migrazione MySQL; tutti i 97 test MySQL sono passati, senza esclusioni. Le nuove regressioni verificano esito condiviso tra finestre, ricevute senza credenziali accessibili soltanto al proprietario, annullamento durante lo scambio con il fornitore e pulizia delle ricevute scadute senza perdere gli account collegati. Passati anche compilazione web, lint e controllo dei tipi.

Il test `npm run test:social-ui`, dopo `npm run build`, avvia un server e un browser headless dedicati con account di collaudo. La pagina di consenso del fornitore è sostituita con una pagina locale esplicitamente simulata; richieste, cookie, callback e salvataggio passano dal backend di test. Le chiamate API dei fornitori usano risposte fittizie e ogni altra richiesta esterna è bloccata. Richiede Playwright già disponibile: `PLAYWRIGHT_MODULE` può indicare il percorso del suo modulo `index.mjs`; `CLICKSOCIAL_BROWSER_CHANNEL=msedge` usa Edge in un profilo temporaneo, altrimenti serve Chromium di Playwright. Non installa browser o pacchetti. Database e schermate restano in una cartella univoca `work/tests/social-ui-*`.

Il collaudo è passato con Edge a 320×844, 390×844, 768×900, 1280×900 e 844×390 pixel: collegamento dei tre provider, scelta della Pagina, conferma e annullamento da una seconda finestra, errore di conferma che resta visibile dopo polling e verifica manuale, nuovo tentativo, finestra bloccata, consenso rifiutato e scadenza. Copre anche guide di Profilo/Studio/Libreria, finestra TikTok, consensi e limiti, invio Instagram fino alla coda con conversione JPEG e blocco dell’invio quando manca l’anteprima. Le schermate sono state esaminate; nessun errore JavaScript è stato rilevato dal test.

Con gli account di collaudo della società verificare sul backend HTTPS: consenso accettato e annullato; scelta di una Pagina diversa; permesso revocato; riconnessione; foto e testo realmente pubblicati; elaborazione TikTok; ritorno da browser ad app e avvio dell’app chiusa. Sui telefoni fisici controllare anche tastiera aperta, cambio orientamento e lettura della guida. I test locali non sostituiscono questo collaudo né una prova di carico con 100 utenti contemporanei.

Al 23 settembre il gestore ha confermato che il server HTTPS e le app aziendali non sono ancora attivi. Restano quindi da verificare sul servizio reale:

- dominio pubblico, callback e accesso alle immagini firmate;
- abilitazioni Meta e TikTok per un cliente esterno al gruppo di sviluppo;
- consenso e pubblicazione di prova su ciascun social, compresi rifiuto, revoca e riconnessione;
- ritorno nell’app iPhone ricompilata, sia aperta sia chiusa.

Questi controlli restano aperti fino a un esito reale documentato; la correzione del codice e i collaudi isolati non li completano.

Nessuna migrazione dello schema: la tabella cifrata esistente ora separa i provider e continua a leggere il vecchio formato Facebook. Conservare database, immagini e chiave di cifratura insieme. Dopo che viene salvato un collegamento nel nuovo formato, una vecchia versione del backend non è un rollback compatibile: usare il backup precedente o mantenere il lettore del formato nuovo.
