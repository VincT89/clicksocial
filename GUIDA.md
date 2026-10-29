# ClickSocial — guida all’uso

Aggiornata il 28 ottobre 2026. Questa guida descrive le funzioni presenti nella copia locale APP: identità aziendale, cinque template, bozze editoriali, Studio, Libreria, collegamenti social e collaudo mobile. Le integrazioni social richiedono l’attivazione del gestore e il collaudo con account reali. ClickSocial è un progetto di [Sodano Consulting](https://sodanoconsulting.it/).

Per caricare il sito sul server e trasferire i dati consulta [PLESK.md](PLESK.md). Dopo il trasferimento usa l’indirizzo HTTPS comunicato dal gestore. L’app iPhone deve essere ricompilata per quel server: una build configurata con l’indirizzo del PC continua a richiederne la disponibilità. La programmazione dei post richiede inoltre che il gestore mantenga attivo il servizio o un’attività pianificata, anche quando nessuno visita il sito.

## Orientarsi nell’app

**Profilo** contiene i dati dell’attività, i loghi, i colori, i font, il template predefinito, i collegamenti social e l’account. **Studio** serve a preparare fotografia, grafica e testi. **Libreria** raccoglie bozze e post salvati e permette di assegnare le date.

La barra di navigazione si trova in alto sul computer e in basso sul telefono. Il pulsante **Guida** illustra i controlli presenti nella schermata aperta. Usa **Avanti**, **Indietro**, **Fine** o **Chiudi guida**; sul computer puoi chiudere anche con Esc. Nel Profilo, per leggere la guida di Social, Piano o Account, chiudi la guida, apri quella sezione e avviala nuovamente.

Ogni account vede la propria Libreria. L’amministratore gestisce utenti e piani, ma nella propria Libreria non trova automaticamente i contenuti degli altri account. Usa lo stesso account su computer e telefono per ritrovare gli stessi contenuti salvati.

## Impostare l’identità aziendale

Apri **Profilo → Attività**. Inserisci nome, categoria, valori e personalità dell’attività e il tono aziendale. Queste informazioni danno contesto alla generazione: usa dati reali, evitando informazioni commerciali da confermare.

### Loghi

Puoi caricare una variante **chiara**, una **scura** e una **a colori**. Non è obbligatorio averle tutte: puoi iniziare con un solo logo. I formati accettati sono JPEG, PNG, WebP e GIF, fino a 15 MB per file.

Per ogni variante, **Sfondo del file** permette di scegliere:

| Opzione | Quando usarla |
| --- | --- |
| Rimuovi automaticamente | Il file ha un fondo uniforme bianco o nero da eliminare. |
| Conserva originale / trasparente | Il file è già trasparente o vuoi mantenerlo così com’è. |
| Rimuovi fondo bianco | Vuoi indicare esplicitamente un fondo bianco. |
| Rimuovi fondo nero | Vuoi indicare esplicitamente un fondo nero. |

Controlla sempre l’anteprima. La pulizia rimuove il fondo uniforme collegato ai bordi e conserva i dettagli interni del marchio. Non equivale a uno scontorno professionale di sfondi complessi: in quel caso usa il logo trasparente originale.

Nello Studio, **Variante del logo → Automatica in base al contrasto** sceglie fra i file caricati. Puoi anche scegliere una variante precisa. L’app mantiene le proporzioni del logo e lo ancora nella posizione prevista dal template, senza ricolorarne il disegno.

Il contrasto considera anche la trasparenza del marchio. Se non basta la correzione locale del fondo, compare un avviso sotto l’anteprima: la fotografia e il logo rimangono visibili e puoi continuare a modificare e salvare. Prova un’altra variante, un altro template o regola il ritaglio per migliorare la leggibilità. Un file mancante, illeggibile o completamente vuoto dopo la pulizia deve invece essere corretto prima di esportare.

### Colori e font

I colori sono **quattro in totale**: primario, secondario, aggiuntivo 1 e aggiuntivo 2. Puoi usare il selettore oppure inserire un codice HEX o RGB. Sostituisci la palette iniziale con quella dell’azienda.

| Inserimento | Esempio | Colore salvato |
| --- | --- | --- |
| HEX con o senza cancelletto | `#FF8000` oppure `FF8000` | `#FF8000` |
| HEX abbreviato di tre cifre | `#F80` | `#FF8800` |
| RGB con parentesi | `rgb(255, 128, 0)` | `#FF8000` |
| RGB con tre numeri | `255, 128, 0` | `#FF8000` |

Sono accettati anche tre numeri separati da spazi, come `rgb(255 128 0)`. I valori RGB devono essere interi tra **0 e 255**; non usare percentuali, nomi di colori o un quarto valore di trasparenza. Uscendo dal campo, un codice valido viene mostrato come HEX completo. La conversione conserva lo stesso colore: questo valore HEX viene salvato e passato all’AI. Un valore non valido impedisce il salvataggio e indica il campo da correggere.

La palette viene passata all’AI. Quando applica i testi alla fotografia, l’app sceglie un colore leggibile della palette oppure bianco o nero. Se necessario schiarisce o scurisce il fondo sotto gli elementi, con bordi sfumati e mantenendo visibile la foto. Il contrasto non sostituisce il controllo visivo della composizione.

Puoi scegliere separatamente **Font dei titoli** e **Font dei testi**. Sono inclusi Bricolage Grotesque e DM Sans. Per il carattere aziendale carica un file WOFF2, WOFF, TTF o OTF fino a 5 MB, nella variante che vuoi usare. Attendi il completamento del caricamento prima di salvare.

### Template predefinito e salvataggio

**Template predefinito per i nuovi post** stabilisce lo schema proposto inizialmente. Potrai modificarlo nello Studio o nella bozza editoriale.

Premi **Salva dati azienda** per conservare tutte le impostazioni. I nuovi contenuti le recuperano automaticamente. Un post già salvato mantiene invece la propria copia di loghi, colori e font: per aggiornarla aprilo nello Studio, premi **Usa le impostazioni aziendali aggiornate**, controlla l’anteprima e salva il post.

## Pianificare prima dello shooting

In **Libreria → Nuova bozza** puoi preparare un contenuto senza avere ancora le fotografie. È obbligatorio soltanto l’argomento.

| Campo | Cosa inserire |
| --- | --- |
| Argomento | Il contenuto da preparare, riconoscibile nella Libreria. |
| Obiettivo e messaggio | Ciò che il post dovrà comunicare. |
| Pubblicazione prevista | La data editoriale desiderata, facoltativa. |
| Social | La piattaforma per cui preparare il contenuto. |
| Scatti da preparare | Le fotografie necessarie allo shooting. |
| Data shooting | Il giorno e l’ora dello shooting, facoltativi. |
| Preparazione | Da preparare, Da fotografare oppure Materiale disponibile. |
| Testo provvisorio | Indicazioni o una prima proposta di testo del cliente. |
| Note | Vincoli, richieste e informazioni da rispettare. |
| Template e formato | La disposizione e le proporzioni desiderate per il post. |

Premi **Salva bozza**. Non vengono effettuate chiamate AI. La data dello shooting organizza la produzione delle fotografie; la pubblicazione prevista organizza il calendario dei contenuti. Nessuna delle due avvia un invio automatico al social. Puoi lasciare una bozza senza data e ritrovarla in **Da pianificare**.

Le date vengono mostrate nel fuso del dispositivo: controlla il fuso indicato nel modulo, soprattutto se lavori da dispositivi configurati diversamente.

Un esempio esclusivamente dimostrativo: argomento «Presentazione di un prodotto», obiettivo «Mostrarne un dettaglio», scatti «Foto frontale e particolare», preparazione «Da fotografare», testo provvisorio «Da concordare con il cliente». Sostituisci queste indicazioni con quelle dello shooting reale.

## Generare dalla bozza

1. Apri la bozza dalla Libreria e scegli **Genera dalla bozza**.
2. Nello Studio controlla il riepilogo **Dalla bozza** e **Brief e scatti da preparare**.
3. Carica la fotografia dopo lo shooting; controlla template, formato e modalità.
4. Premi **Genera post dalla bozza** e rileggi il risultato.
5. Premi **Salva post**.

L’app recupera automaticamente brief, template, formato e identità salvata. L’AI usa obiettivo, testo provvisorio e note come indicazioni, insieme alla fotografia. Gli scatti richiesti non vengono trattati come fatti già presenti nell’immagine: il risultato va comunque verificato.

Il salvataggio aggiorna **lo stesso contenuto**, mantenendo brief e data prevista. Caricare la foto porta la preparazione a **Materiale disponibile**; dopo il salvataggio dell’immagine finale il contenuto viene indicato come **Post creato**. Per aggiornare il brief usa **Apri brief e scatti da preparare** nella Libreria, finché il contenuto è modificabile.

## Cinque template sulla foto a tutto sfondo

Il template fissa la disposizione degli elementi sovrapposti alla fotografia. Viene salvato e riutilizzato: due generazioni con lo stesso schema mantengono le posizioni di testi e logo, mentre cambiano fotografia e contenuti. Le righe e la dimensione del testo possono adattarsi alla sua lunghezza.

| Template | Posizione del logo | Zona prevista per il soggetto |
| --- | --- | --- |
| Testi a sinistra | In basso a destra | Sulla destra. |
| Testi a destra | In basso a sinistra | Sulla sinistra. |
| Testi in alto | In basso a destra | Nella parte inferiore. |
| Testi in basso | In alto a destra | Nella parte superiore. |
| Testi centrati | In basso al centro | Sopra il messaggio. |

L’AI riceve le coordinate delle zone riservate a titolo, sottotitolo e logo e l’indicazione della zona per il soggetto. Deve lasciare uno sfondo fotografico continuo nelle aree di testo. L’app applica poi i testi con i font reali e il file del logo aziendale nelle posizioni del template.

La disposizione degli elementi è controllata dall’app; il rispetto delle indicazioni nella fotografia generata richiede una verifica visiva. Con una foto già scattata, scegli uno schema compatibile e regola il ritaglio: l’app non sposta automaticamente persone o oggetti all’interno dell’immagine.

I template sono progettati nel codice di ClickSocial. Al momento non è presente un editor per trascinare liberamente logo e testi o costruire nuovi schemi dall’interfaccia.

## Formati e inquadratura

| Formato | Dimensione del file finale |
| --- | --- |
| 1:1 | 1080 × 1080 pixel |
| 4:5 | 1080 × 1350 pixel |
| 9:16 | 1080 × 1920 pixel |
| 16:9 | 1920 × 1080 pixel |

Ogni template prevede posizioni e margini per tutti e quattro i formati. Cambiare formato non avvia una nuova generazione AI: la foto esistente viene adattata al nuovo riquadro.

**Inquadratura della foto** permette di regolare il ritaglio orizzontale e verticale. I cursori spostano la porzione visibile senza deformare la fotografia. Se le proporzioni coincidono, un cursore può non produrre variazioni visibili. Controlla sempre volti, prodotti e dettagli dopo un cambio di formato.

## Lavorare nello Studio

Puoi partire direttamente da **Nuovo post** quando hai già la foto. **Scegli foto** carica dal dispositivo; **Scatta foto** apre la fotocamera. Prima del caricamento puoi controllare lo scatto, rifarlo o confermare con **Usa foto**.

### Modalità e richieste AI

| Modalità | Cosa fa nei nuovi template | Richieste per una generazione riuscita |
| --- | --- | --- |
| Original | Mantiene la fotografia e prepara i testi. | Una richiesta per i testi. |
| Enhance | Prepara i testi e ritocca la fotografia. | Una richiesta per i testi e una per l’immagine. |
| Creative | Prepara i testi e reinterpreta l’ambientazione della fotografia. | Una richiesta per i testi e una per l’immagine. |

La fotografia viene compresa nella stessa richiesta che prepara i testi. Nei nuovi template non serve una richiesta AI separata per scegliere la posizione del logo: lo posiziona l’app.

Scegli il social, il tono e compila **Cosa vuoi comunicare?** con indicazioni reali. Questi dati vengono usati quando premi Genera. Il testo provvisorio della bozza guida la scrittura ma non è una promessa di riproduzione parola per parola: i campi del risultato restano modificabili.

Premere Genera o rigenerare può comportare consumi sul servizio AI dell’azienda. Cambiare manualmente testi, filtri, formato, template, ritaglio o variante del logo non avvia nuove chiamate AI. Il piano gratuito ha un limite applicativo di due generazioni; Pro lo rimuove, ma non elimina i costi del fornitore.

### Durante l’attesa

Il modale mostra l’attività in corso, messaggi su Sodano Consulting e **Scopri Sodano Consulting**, collegato a [sodanoconsulting.it](https://sodanoconsulting.it/). Puoi ridurre la finestra e cambiare sezione mentre l’app continua a lavorare. Mantieni l’app aperta e, al termine, controlla e salva il risultato. La finestra si chiude al completamento o segnala l’errore.

### Filtri e testi

I filtri rapidi applicano una combinazione di regolazioni. Per modificare una barra manualmente, premila prima per sbloccarla e poi muovi il cursore. Il lucchetto la blocca nuovamente. **Ripristina** riporta la fotografia alle regolazioni iniziali. Nei template il ritocco della foto non ricolora il logo e i testi.

| Campo | Dove viene usato |
| --- | --- |
| Titolo grafica | Il messaggio principale disegnato sulla foto. |
| Testo di supporto nella grafica | Un testo breve sulla foto; è facoltativo. |
| Caption | Il testo che accompagna la pubblicazione. |
| Hashtag | Gli hashtag del post. |
| Titolo nella Libreria | Il nome interno per riconoscere il contenuto. |

Titolo e testo di supporto vengono misurati con i font scelti e adattati allo spazio. Se il testo è troppo lungo per rimanere leggibile, lo Studio segnala il problema e impedisce l’esportazione: accorcialo o cambia template. Sposta nella caption i dettagli che non servono nella grafica.

**Copia tutto** copia caption e hashtag. **Bozza** indica un contenuto ancora in lavorazione; **Pronto per la pubblicazione** indica che lo hai preparato. Lo stato non invia automaticamente il post a un social.

### Salvare e riprendere

**Salva post**, nella barra superiore, conserva immagine finale, testi, filtri, template, formato e identità aziendale. I nuovi template vengono esportati in PNG con le dimensioni indicate sopra. Anteprima ed esportazione usano la stessa composizione.

Nel browser la bozza aperta resta disponibile quando cambi sezione, ma devi salvarla prima di ricaricare o chiudere la pagina. Nell’app mobile la bozza viene conservata sul dispositivo per account e backend; per vederla nella Libreria o da un altro dispositivo occorre comunque salvare. Foto e dati remoti richiedono il collegamento al backend: non è una modalità offline.

## Modificare un post esistente

Apri il post dalla Libreria e scegli **Modifica**. Cambia ciò che serve e premi **Salva post**. Template, versione e identità del contenuto sono conservati: cambiare il Profilo non modifica automaticamente i post precedenti.

I primi template con foto e testo in aree distinte restano utilizzabili per riaprire i contenuti salvati con quella versione. Per applicare la nuova disposizione scegli uno dei cinque schemi nello Studio e salva.

I post ancora precedenti possono avere testi già impressi nelle immagini AI. **Applica un template alla foto originale** riparte dalla fotografia originale e rende modificabili testi e logo; non estrae le scritte già disegnate nella vecchia grafica.

Un post già pubblicato è in sola lettura. Per modificare un contenuto in coda occorre prima annullare l’invio dalla Libreria; durante l’invio alcune azioni restano bloccate.

## Libreria, date e pubblicazione

**Agenda** elenca i contenuti per giorno ed è la vista iniziale sul telefono. **Calendario** permette di scegliere un mese e un giorno. **Tutti i post**, **Bozze editoriali** e **Da pianificare** aiutano a distinguere i contenuti salvati, quelli ancora in preparazione e quelli senza data. Sul telefono usa **Visualizza**.

La ricerca considera titolo, testi, note e brief. I filtri restringono i risultati per piattaforma e stato. **Azzera filtri** torna alla visualizzazione completa; **Aggiorna** rilegge i dati dal backend.

**Pianifica** o **Modifica data** imposta data editoriale e note. Dal menu **Altre azioni** puoi, quando il contenuto lo consente:

- Scaricare foto e testo in un unico ZIP.
- Copiare caption e hashtag.
- Modificare un invio automatico ancora in coda.
- Annullare un invio in coda.
- Segnare una pubblicazione già effettuata manualmente.
- Eliminare il contenuto dopo conferma.

**Segna come pubblicato** registra un’azione già eseguita: non pubblica al tuo posto. Per inviare una foto usa il pulsante **Pubblica foto** nella scheda del post. Serve Pro, il social attivato dal gestore e un account autorizzato.

La finestra mostra la foto salvata nello Studio. Se l’anteprima non si carica, l’invio resta bloccato: chiudi e riapri la finestra per riprovare. Scegli l’account di destinazione e controlla il testo con gli hashtag: puoi modificarlo per questo invio senza riscrivere il testo originale nello Studio. Il contatore segnala quanto accorciare un testo troppo lungo. Il social resta quello scelto nel post; un invio riguarda un solo social.

Per inviare appena possibile premi **Conferma pubblicazione**. Per scegliere un momento futuro attiva **Programma per una data futura**, controlla l’ora locale indicata e premi **Conferma programmazione**. Confermare aggiorna anche la data editoriale. La Libreria mostra prima l’invio in coda, poi l’elaborazione e infine l’esito. Il server controlla ogni 30 secondi, ma l’elaborazione del social può richiedere più tempo.

Per Instagram sono previsti post foto quadrati, 4:5 o 16:9; il formato 9:16 non viene trasformato automaticamente in un Reel. Se serve, cambia il formato nello Studio e salva. L’app prepara una copia JPEG per l’invio a Instagram o TikTok senza modificare l’immagine originale salvata.

Su TikTok scegli esplicitamente la visibilità tra quelle consentite dal tuo account. I commenti partono disabilitati; puoi abilitarli se l’account lo permette. Puoi impostare un titolo, l’aggiunta della musica e l’etichetta AI. Se promuovi un’attività attiva la dichiarazione commerciale e indica il marchio coinvolto; le collaborazioni con altri marchi non possono avere visibilità Solo io. Prima dell’invio leggi e accetta le condizioni indicate. TikTok può limitare ai test privati un’app aziendale non ancora approvata.

**Esito da verificare sul social** indica che ClickSocial non sa con certezza se l’invio sia riuscito. Non ripete l’invio. Apri il profilo sul social, controlla anche eventuali elaborazioni pendenti, poi usa **Il post è presente** oppure **Il post non è presente** nella Libreria. La seconda scelta sblocca il contenuto ma non lo invia: un nuovo tentativo richiede una nuova conferma. Durante l’invio, o prima di risolvere un esito incerto, il contenuto è protetto da modifiche e cancellazioni.

Il servizio di invio deve essere configurato e attivo sul backend. Il semplice avvio di collaudo **AVVIA-MOBILE.cmd non avvia il servizio periodico di pubblicazione**. Il PC spento non può eseguire gli invii.

## Account, piano e amministrazione

In **Profilo → Social** trovi Facebook, Instagram e TikTok separati. Premi **Collega**, accedi sul sito ufficiale del social, autorizza ClickSocial e torna nell’app. Seleziona l’account o le Pagine corrette e premi **Conferma account selezionati**. Su iPhone usa **Torna a ClickSocial** o chiudi la finestra di autorizzazione per rientrare nel Profilo. Il gestore configura l’app sviluppatore della società; il cliente non deve creare app né inserire chiavi API.

Facebook richiede una Pagina su cui puoi pubblicare. Instagram richiede un account professionale Business o Creator; il percorso Instagram Login usato qui non richiede di collegarlo a una Pagina Facebook. Se appare **Attivazione a cura del gestore**, la configurazione del servizio manca ancora. L’accesso Google, quando configurato, resta un collegamento separato e nel collaudo nativo si usa email e password.

**Verifica collegamenti** controlla le autorizzazioni attuali. **Ricollega** serve dopo scadenza, revoca dei permessi o cambiamento dell’account; annullare il nuovo tentativo conserva il collegamento precedente. Il tentativo scade dopo 15 minuti. **Scollega** rimuove l’accesso salvato in ClickSocial e annulla solo la coda di quel social; gli altri social, le foto e le date editoriali restano. Per revocare anche il consenso dato al fornitore usa le impostazioni del social. Se un invio è in corso o incerto, completane prima la verifica.

Puoi confermare l’account anche nella finestra aperta dal social: tornando alla scheda iniziale di ClickSocial, lo stato si aggiorna automaticamente. Se il browser blocca la finestra, premi **Apri autorizzazione**. Se chiudi la finestra prima di autorizzare, usa **Annulla collegamento** e poi riprova. Un errore durante la conferma rimane visibile mentre controlli le indicazioni; gli aggiornamenti automatici non lo nascondono. Quando il tentativo scade, puoi ripartire con **Collega** o **Ricollega**, controllando prima lo stato degli account mostrato nella stessa pagina.

In **Piano** puoi leggere il piano corrente e usare **Aggiorna stato del piano** dopo una variazione. L’acquisto richiede il servizio di pagamento configurato. La dicitura Pro non garantisce che tutti i servizi esterni siano già attivi.

In **Account**, **Imposta o cambia password** apre il recupero dell’accesso. **Esci dall’account** termina la sessione senza eliminare i post salvati. L’eliminazione dell’account è definitiva: cancella i dati dell’account e annulla l’eventuale abbonamento, dopo la conferma prevista dall’app.

Gli amministratori vedono **Area azienda**, per utenti e piani, e **Sviluppatore**, per richieste AI e consumi. Le cifre economiche sono stime dei consumi registrati nell’installazione, con eventuali dati incompleti segnalati; non sono la fattura del fornitore né necessariamente il totale dell’account OpenAI.

## Avvio sul PC e prova Android

La cartella di lavoro aggiornata è `C:\Users\vince\OneDrive\Desktop\SODANO\APP`, sul branch `main_vincenzo`. Le vecchie copie o gli ZIP dei sorgenti non vengono aggiornati automaticamente quando cambia questa cartella.

| Uso | Avvio e indirizzo |
| --- | --- |
| Versione web sul PC | Apri AVVIA.cmd dalla cartella APP; usa http://127.0.0.1:5180. |
| Backend per il telefono | Apri AVVIA-MOBILE.cmd; l’APK fornito usa http://192.168.1.6:5181. |
| Nuova compilazione Android | Apri COMPILA-ANDROID.cmd dalla cartella APP. |

Per Android, collega PC e telefono alla stessa rete Wi-Fi, lascia acceso il PC e installa l’APK aggiornato. Mantieni attivo il database già configurato. Il programma di avvio deve mostrare lo stesso indirizzo incluso nell’APK.

Dal browser del telefono puoi verificare http://192.168.1.6:5181/api/health: una risposta con `ok: true` indica che il backend è raggiungibile. Se non risponde, controlla IP, rete Wi-Fi e accesso di Node tramite Windows Firewall sulla rete privata. Sul telefono `localhost` indica il telefono stesso.

Se l’indirizzo del PC cambia, il target deve essere aggiornato e l’app ricompilata. La procedura tecnica è in MOBILE.md nella repository; la guida di test consegnata contiene anche i comandi e la configurazione Codemagic.

Accedi con la password del tuo account. L’aggiornamento dell’app non assegna una nuova password. Se SMTP non è configurato, i codici e i link di recupero sono nella posta locale: avvia anche AVVIA.cmd sul PC e apri http://127.0.0.1:5180/dev/mail. Completa il recupero sul PC, quindi usa la nuova password sul telefono.

## Quando riavviare o ricompilare

| Modifica | Cosa fare |
| --- | --- |
| Loghi, colori, font caricati o dati aziendali dal Profilo | Salva dati azienda. Per un post esistente aggiorna il brand nello Studio e salva. Non serve ricompilare. |
| Testi, ritaglio, filtri, template o formato scelti dall’interfaccia | Salva il post. Non serve ricompilare né richiamare l’AI. |
| Codice dell’interfaccia, guida interna, definizione dei template o font inclusi | Prepara la nuova versione web; per Android ricompila e installa l’APK aggiornato. Per iOS servirà una nuova build. |
| Codice del backend o impostazioni dei servizi | Riavvia il backend aggiornato. Se cambia anche l’interfaccia, aggiorna anche l’app. |
| Indirizzo del backend incluso nell’app | Aggiorna il target, ricompila e installa la nuova build. |

Se l’app locale è già avviata, ferma la sua finestra con Ctrl+C prima di rilanciarla per applicare gli aggiornamenti. Un secondo avvio può soltanto indicare che esiste già un’istanza, senza sostituirla.

I modelli AI sono impostazioni del backend. Template e identità aziendale non richiedono nuove variabili nell’ENV. Le chiavi AI e le credenziali del database restano sul backend e non devono entrare nella repository o nell’APK.

## iPhone, GitHub e Codemagic

Un APK è per Android e non si installa su iPhone. Il progetto iOS è presente e sincronizzato. Il workflow ios-simulator produce una build per simulatore; il nuovo ios-testflight è predisposto per creare un’app firmata e caricarla su App Store Connect.

La build 1.0 (5) è stata compilata, caricata su TestFlight e resa disponibile al gruppo interno durante il collaudo del 12 settembre. Le modifiche ai collegamenti social richiedono una nuova build; non sono già presenti in quella installata. La procedura di firma è descritta in IOS-CODEMAGIC.md. La build iOS richiede macOS/Xcode; la verifica dei sorgenti da Windows non equivale alla compilazione per iPhone.

La configurazione include i workflow Codemagic Android, iOS simulatore e iPhone/TestFlight. Le ultime modifiche sono state realizzate localmente su main_vincenzo e non sono state pubblicate con un push da questa attività. Per compilare nel cloud occorre che Codemagic utilizzi il codice aggiornato del branch corretto e un target backend esplicito. Il workflow iPhone carica il pacchetto senza inviarlo alla revisione pubblica; il primo accesso per i tester interni si configura in App Store Connect.

Codemagic compila l’app ma non ospita il backend. Con il target Wi-Fi attuale, anche l’app consegnata al capo deve raggiungere il PC sulla stessa rete. Per usarla altrove servirà un backend raggiungibile, con la configurazione del futuro server ancora da definire.

## Problemi frequenti

| Problema | Controllo utile |
| --- | --- |
| Il telefono non accede | Controlla PC acceso, database, stessa rete e indirizzo incluso nell’APK; prova il collegamento health. |
| Non compaiono gli aggiornamenti | Riavvia il backend corretto e installa l’ultimo APK. Sul browser ricarica dopo la nuova compilazione. |
| Il logo ha ancora un rettangolo bianco o nero | Controlla Sfondo del file nella variante del Profilo; salva e aggiorna l’identità del post aperto. |
| Il logo o il testo si confonde con la foto | Prova una variante del logo, uno schema più adatto o un ritaglio diverso; controlla i colori aziendali. |
| Compare un messaggio sul testo troppo lungo | Accorcia titolo o testo di supporto, oppure cambia template. Metti i dettagli nella caption. |
| Genera non è disponibile | Controlla fotografia, stato del contenuto, generazione già in corso, limite del piano e configurazione AI del backend. |
| La data non provoca una pubblicazione | È una data editoriale. Usa Pubblica foto, conferma l’invio e verifica che il servizio periodico sia attivo sul server. |
| Il collegamento richiede HTTPS | Il gestore deve attivare il backend pubblico e i callback social. Il solo indirizzo Wi-Fi del PC non basta. |
| Non trovo la Pagina Facebook | Verifica di poter pubblicare su quella Pagina e di averla autorizzata nel consenso Meta. Ricollega se necessario. |
| TikTok rifiuta un invio pubblico | L’app della società potrebbe non aver ancora superato la verifica TikTok; il gestore deve controllare permessi e approvazione. |
| L’invio ha un esito incerto | Controlla il social e registra l’esito in Libreria. Non ripetere l’invio prima della verifica. |
| Un altro dispositivo non vede la bozza | Usa lo stesso account e backend e verifica di aver salvato il contenuto nella Libreria. |
| L’immagine generata copre un soggetto importante | Rivedi l’anteprima, lo schema e le indicazioni. La composizione AI richiede una verifica umana. |

## Stato delle verifiche e funzioni successive

Il 23 settembre sono passati i controlli del codice, la compilazione web, 96 test su SQLite (il test di migrazione MySQL è escluso in questa modalità) e tutti i 97 test su MySQL temporaneo. Le verifiche comprendono anche accesso Google, calendario, isolamento dei clienti, recupero dopo un riavvio, rinnovo dei token e prevenzione dei reinvii.

Nel browser di test isolato sono stati percorsi Profilo, Studio, Libreria e tutte le tappe disponibili delle relative guide, a 320×844, 390×844, 768×900, 1280×900 e 844×390 pixel. Il collaudo ha verificato i tre collegamenti, conferma e annullamento da una seconda finestra, errori persistenti, finestra bloccata, consenso rifiutato, scadenza e nuovo tentativo. Ha verificato anche scelta della Pagina, opzioni TikTok, limiti del testo, anteprima obbligatoria, conversione JPEG e salvataggio dell’invio. Le risposte dei social e gli account erano di collaudo; nessun contenuto è stato pubblicato sui social reali. Le schermate esaminate e i test responsive non sostituiscono la prova su iPhone/Android fisici, in particolare ritorno dall’autorizzazione e tastiera aperta.

Le fotografie AI reali, la fotocamera e il comportamento sui telefoni fisici richiedono il collaudo con i materiali e i dispositivi dell’azienda. I test dimostrativi non certificano il risultato di una generazione reale o una pubblicazione social.

Caroselli con più foto, reel/video, una pre-chiamata separata per testi clienti e la distribuzione sul server dedicato restano da sviluppare o definire. L’attivazione delle integrazioni della società e il collaudo reale sono descritti in [SOCIAL.md](SOCIAL.md).
