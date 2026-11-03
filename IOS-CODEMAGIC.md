# ClickSocial su iPhone con Codemagic

Il workflow `ios-testflight` prepara una build firmata per iPhone. L’app installata da TestFlight usa il backend Plesk all’indirizzo `https://s4.sodanoconsulting.it`.

## Registrare ClickSocial su Apple

Accedi al [portale Apple Developer](https://developer.apple.com/account/resources/identifiers/list). Controlla se esiste già un identificativo per questa app; se esiste, usa quello senza crearne un duplicato. Altrimenti, in Identifiers, premi + e scegli App IDs, quindi App.

Compila Description con `ClickSocial`, seleziona Explicit e inserisci il Bundle ID già approvato: `it.sodanoconsulting.clicksocial`. Completa con Continue e Register. Per questa prima compilazione non servono nuove capacità opzionali. [Procedura Apple](https://developer.apple.com/help/account/identifiers/register-an-app-id).

In [App Store Connect](https://appstoreconnect.apple.com/), apri Apps. Se ClickSocial è già presente, aprila. Altrimenti scegli +, New App: piattaforma iOS, lingua Italiano e lo stesso Bundle ID. Il nome richiesto è ClickSocial; se Apple lo segnala indisponibile, va concordato un nome disponibile. Lo SKU è un codice interno univoco: `clicksocial-ios` è una proposta per una nuova scheda, non un valore già registrato. Apple deve avere la scheda dell’app prima del caricamento della build. [Creazione della scheda](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app).

## Preparare firma e accesso in Codemagic

In App Store Connect, Users and Access → Integrations → App Store Connect API, crea una chiave dedicata a Codemagic con ruolo App Manager. Scarica il file .p8 e conserva Key ID e Issuer ID. Il file si può scaricare una sola volta.

In Codemagic, Team settings → Team integrations → Developer Portal, aggiungi la chiave .p8 con i suoi due identificativi. Puoi scegliere il nome del collegamento: il workflow non dipende da quel nome.

Apri poi Team settings → codemagic.yaml settings → Code signing identities. Nella sezione iOS certificates genera un certificato Apple Distribution con la chiave collegata, oppure carica un certificato valido già disponibile con la sua chiave privata. Conserva il file e la password; se richiesto dalla schermata, carica il certificato appena generato. Nei provisioning profiles aggiungi un profilo App Store per `it.sodanoconsulting.clicksocial` associato allo stesso certificato. Puoi recuperarlo dal portale Apple; se manca, crealo lì e poi recuperalo o caricalo. Il workflow seleziona i file per tipo e Bundle ID. [Firma in Codemagic](https://docs.codemagic.io/yaml-code-signing/signing-ios/), [profilo App Store Apple](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile).

Le chiavi e le password vanno inserite solo nei servizi indicati: non inviarle in chat e non aggiungerle alla repository.

## Variabili della compilazione

Per TestFlight configura il gruppo seguente nelle Environment variables dell’app Codemagic.

| Gruppo | Variabile | Valore |
| --- | --- | --- |
| `clicksocial_apple` | `APP_STORE_CONNECT_PRIVATE_KEY` | Contenuto completo del .p8, con intestazione e righe originali; attiva Secret |
| `clicksocial_apple` | `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID della stessa chiave; attiva Secret |
| `clicksocial_apple` | `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID corrispondente; attiva Secret |

Il workflow TestFlight imposta direttamente il dominio pubblico e `MOBILE_LOCAL_TEST=false`. Il gruppo `clicksocial_local` serve ai workflow Android e simulatore per il collaudo sul PC. Le chiavi AI restano sul backend. [Pubblicazione con Codemagic](https://docs.codemagic.io/yaml-publishing/app-store-connect/).

## Portare la versione aggiornata su GitHub

Codemagic legge il codice da GitHub. Le modifiche locali devono prima essere salvate in un commit e caricate su `main_vincenzo`, compresi `codemagic.yaml`, i file condivisi, i componenti nuovi e i font inclusi. Controlla le modifiche prima del commit; mantieni esclusi .env, dati, uploads, chiavi e output di compilazione.

In Codemagic aggiungi o apri la repository `VincT89/clicksocial` e usa la configurazione codemagic.yaml. Avvia manualmente una compilazione dal branch `main_vincenzo`, selezionando **ClickSocial iPhone - TestFlight**. Il workflow rifiuta un branch diverso.

## Compilazione e installazione

Il workflow installa le dipendenze, verifica l’app, prepara Capacitor per iOS, applica la firma e compila con Xcode su macOS. Usa il progetto `ios/App/App.xcodeproj` e lo schema `App`, con Swift Package Manager. Non richiede un Mac personale o CocoaPods per questo progetto.

Il pacchetto .ipa compare negli artifacts, sotto `work/mobile-builds/ios/`. Viene poi caricato su App Store Connect; il workflow non invia l’app alla revisione pubblica né alla revisione beta esterna. Dopo l’elaborazione Apple, apri TestFlight in App Store Connect, risolvi eventuali richieste informative effettivamente mostrate e aggiungi la build a un gruppo di tester interni con il tuo utente autorizzato. Installa TestFlight sull’iPhone e apri l’invito. [Test interni Apple](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers).

Il numero della build aumenta con il contatore Codemagic. Usa una compilazione alla volta per questa app. Se esistono già build caricate da un’altra procedura, confronta i numeri prima del primo invio: il nuovo numero deve essere maggiore di quelli già utilizzati nella versione corrente. Non azzerare il contatore del workflow durante i test. [Numerazione delle build](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/#build-versioning).

Nel log di **Prepara progetto iOS** verifica che compaiano il dominio `https://s4.sodanoconsulting.it` e `Collaudo locale: no`. Con il backend attivo su Plesk, l’iPhone può usare Wi-Fi o rete mobile anche a PC spento.

## Cosa è stato verificato

Le build 1.0 (5) e 1.0 (10) sono state caricate su App Store Connect. La build 10 è stata preparata con il collaudo locale attivo. Il cambio di server e le correzioni successive richiedono una nuova build e una prova sull’iPhone.

## Usare il backend Plesk

Verifica che il sito risponda dal telefono, poi installa la build TestFlight compilata dal commit aggiornato. Prova accesso, file privati, generazione e ritorno dal consenso social anche fuori dalla rete del PC. [Guida Plesk](PLESK.md).
