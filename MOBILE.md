# ClickSocial con Capacitor

L’app mobile usa la stessa interfaccia e le stesse API del sito. Nome: ClickSocial. Identificativo Android e iOS: it.sodanoconsulting.clicksocial. Il backend, il database e le chiavi dei servizi restano sul computer o sul futuro server.

## Collaudo sulla rete locale

Avvia il backend con AVVIA-MOBILE.cmd e collega telefono e computer alla stessa rete Wi-Fi. Il telefono deve poter raggiungere l’indirizzo LAN mostrato dal programma. Il firewall deve consentire l’accesso al backend sulla rete privata.

Il target di compilazione locale viene conservato in work/mobile-target.json, escluso da Git. Controlla che corrisponda all’indirizzo del computer: localhost sul telefono indica il telefono stesso. Dopo un cambio di indirizzo prepara nuovamente l’app con il target corretto. Non modificare i file nativi generati a mano.

Con Node.js 24.10 o successivo e le dipendenze installate, esegui dalla cartella del progetto:

```text
npm run mobile:prepare
```

Il comando usa il target salvato, compila in dist-mobile e sincronizza Android e iOS. Si possono passare --api con l’URL verificato del backend e --local per il collaudo HTTP su LAN; --platform=android o --platform=ios limita la sincronizzazione a una piattaforma.

I font inclusi sono copiati nell’app. Foto, loghi e font personalizzati richiedono l’accesso autenticato al backend. Pianificazione e template non richiedono nuove variabili per i modelli: AI_TEXT_MODEL e AI_IMAGE_MODEL restano impostazioni del backend.

## APK Android

Servono Java 21 e Android SDK. Lo script riconosce l’SDK locale in work/android-sdk oppure usa ANDROID_HOME.

```text
npm run mobile:android
```

Il comando prepara il frontend, sincronizza Android e compila l’APK di debug in work/mobile-builds/ClickSocial-test.apk. È un pacchetto per il collaudo Android. Non è installabile su iPhone.

Per usare sul telefono le modifiche all’interfaccia, ai template o ai font inclusi, ricompila e installa l’APK aggiornato. Le modifiche soltanto al backend richiedono invece il riavvio del backend. Cambiare le impostazioni aziendali dall’app non richiede una compilazione.

## Codemagic e iOS

codemagic.yaml contiene tre workflow: android-local per l’APK, ios-simulator per il simulatore e ios-testflight per compilare e firmare un pacchetto iPhone da caricare su App Store Connect. Quest’ultimo richiede i certificati e il profilo App Store in Code signing identities, oltre alle variabili protette del gruppo clicksocial_apple. Parte manualmente soltanto da main_vincenzo e non invia l’app alla revisione pubblica o beta esterna. Il numero della build deriva dal contatore Codemagic; va confrontato con eventuali build preesistenti prima del primo invio.

La procedura completa per account, firma e installazione è in [IOS-CODEMAGIC.md](IOS-CODEMAGIC.md). Nel gruppo Codemagic clicksocial_local vanno configurati MOBILE_API_ORIGIN e MOBILE_LOCAL_TEST=true per il collaudo sulla rete locale. L’URL deve essere raggiungibile dal dispositivo durante l’uso dell’app; il servizio di compilazione non ospita il backend.

Il progetto iOS viene sincronizzato anche da Windows. La compilazione con Xcode richiede macOS, disponibile nei workflow Codemagic iOS. Il pacchetto per simulatore non si installa su un iPhone fisico. Durante il collaudo del 12 settembre è stata caricata la build 1.0 (5) su TestFlight; le modifiche successive e il passaggio al server pubblico richiedono una nuova build.

Mantieni .env, database, uploads e chiavi di firma fuori da Git. Le eccezioni HTTP sono generate soltanto per il target di collaudo locale; il futuro server pubblico richiederà un target HTTPS.

## Passaggio al sottodominio pubblico

Completa prima caricamento e collaudo web secondo [PLESK.md](PLESK.md). Poi configura `MOBILE_API_ORIGIN` con l’URL HTTPS reale e `MOBILE_LOCAL_TEST=false` nel workflow Codemagic. Controlla che la compilazione legga il commit aggiornato, ricompila e installa la nuova build. Non aggiungere chiavi AI, SMTP o dei social al frontend o alle variabili `VITE_*`. Il PC può rimanere spento quando backend, database e file sono effettivamente sul server e l’app punta a quel server.
