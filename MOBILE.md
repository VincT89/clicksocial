# ClickSocial con Capacitor

L’app mobile usa la stessa interfaccia e le stesse API del sito. L’identificativo Android e iOS di ClickSocial è `it.sodanoconsulting.clicksocial`. Per TestFlight il backend, il database e le chiavi dei servizi si trovano su Plesk. Nel collaudo Wi-Fi l’app usa invece il backend del PC.

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

Il gruppo Codemagic `clicksocial_local` configura il collaudo Wi-Fi per Android e simulatore. Il workflow TestFlight usa direttamente `https://s4.sodanoconsulting.it` con `MOBILE_LOCAL_TEST=false`. [Guida a firma e installazione](IOS-CODEMAGIC.md).

Il progetto iOS viene sincronizzato anche da Windows. La compilazione con Xcode richiede macOS, disponibile nei workflow Codemagic iOS. Il pacchetto per simulatore non si installa su un iPhone fisico. Durante il collaudo del 12 settembre è stata caricata la build 1.0 (5) su TestFlight; le modifiche successive e il passaggio al server pubblico richiedono una nuova build.

Mantieni .env, database, uploads e chiavi di firma fuori da Git. Le eccezioni HTTP sono generate soltanto per il collaudo locale. TestFlight usa HTTPS.

## Passaggio al sottodominio pubblico

Verifica il sito dal telefono e avvia il workflow TestFlight dal commit aggiornato di `main_vincenzo`. Prima di installare la nuova build controlla nel log il dominio Plesk e `Collaudo locale: no`. Le chiavi AI, SMTP e social restano sul server. [Guida Plesk](PLESK.md).
