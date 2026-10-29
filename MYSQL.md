# Database e trasferimento dei dati ClickSocial

Il motore attivo dipende da `DB_DRIVER` nella configurazione del backend. `sqlite` usa `DATA_DIR/clicksocial.sqlite`; `mysql` usa il servizio indicato dalle variabili `MYSQL_*`. Un file SQLite rimasto dopo la migrazione non contiene le successive modifiche fatte in MySQL. Nell’installazione locale analizzata il 28 ottobre 2026 è configurato MySQL.

## Da MySQL locale a MySQL su Plesk

Prepara un database di destinazione dedicato e vuoto. Non avviare ClickSocial sul server prima di importare il backup e trasferire la chiave originale. In caso contrario l’app può inizializzare una nuova installazione, che non va sovrascritta per tentativi.

1. Concorda un breve fermo dell’app locale e della coda di pubblicazione per avere dati stabili durante la copia.
2. Esporta il database **attivo** con struttura e dati, attraverso phpMyAdmin o gli strumenti SQL concordati con il tutor. Conserva il file SQL fuori da percorsi pubblici: contiene dati personali, hash e credenziali cifrate.
3. Copia `data/uploads` e il file nascosto `data/.encryption-key` della stessa installazione. La chiave è necessaria per i token social e i valori firmati. Non sostituirla con una nuova.
4. Importa l’esportazione nel database vuoto di Plesk, selezionando il database corretto. Se l’SQL contiene nomi database locali, usa le opzioni di esportazione appropriate e verifica con il tutor prima dell’importazione.
5. Configura `DB_DRIVER=mysql` e le nuove credenziali SQL nel server. Controlla connessione, conteggi dei dati, accesso dell’amministratore e immagini prima di utilizzare la nuova installazione.

Il valore della chiave viene confrontato con il riferimento salvato in `clicksocial_meta`. Se il backend segnala una chiave differente, recupera il file corretto: non modificare il riferimento nel database per aggirare il controllo.

Le password di ClickSocial sono hash scrypt nel formato `sale:hash`; l’importazione deve mantenerli identici. Non sostituirli con bcrypt o hash prodotti da Laravel Tinker. Usa il recupero password dell’app se necessario.

## Comandi disponibili

I comandi leggono la configurazione del progetto. Eseguili solo sulla destinazione effettivamente scelta e dopo un backup quando previsto.

| Comando | Effetto |
| --- | --- |
| `npm run db:check:mysql` | Controlla connessione, nome e versione del server SQL, senza inizializzare tabelle. La lettura della configurazione può predisporre la directory dati e la chiave se assenti: in una migrazione trasferisci prima quella originale. |
| `npm run db:init:mysql` | Prepara lo schema per una nuova installazione; rifiuta un database con tabelle estranee. Non è un importatore di backup. |
| `npm run db:migrate:mysql` | Controlla il trasferimento dal SQLite locale verso MySQL vuoto senza copiarne i record. |
| `npm run db:migrate:mysql -- --apply` | Copia il contenuto SQLite nella destinazione vuota. Richiede app ferma e conserva il SQLite originale. Non usare per MySQL verso MySQL. |

Per il trasferimento SQLite-MySQL la directory dati scelta deve già contenere il SQLite da trasferire e la sua chiave; il comando controlla file, destinazione e schema. `DB_DRIVER` va impostato su `mysql` dopo il trasferimento riuscito. Conserva uploads, chiave e backup originale.

## Backup e permessi

Con MySQL il solo backup della cartella APP non include il database. Conserva database attivo, uploads, chiave e configurazione in modo coerente, protetto e ripristinabile. Prova il ripristino su una destinazione separata con pubblicazioni automatiche disattivate.

Usa un utente SQL dedicato al solo database ClickSocial. Inizializzazione e operazioni applicative richiedono i permessi previsti dallo schema e dalle query del progetto; non assegnare privilegi globali per risolvere errori. Per un database remoto imposta TLS verificato con la CA del fornitore.

Le versioni di MySQL/MariaDB devono essere confermate e provate sull’hosting. I test locali avviano un server temporaneo con `MYSQL_TEST_SERVER` e non utilizzano il database configurato nell’app. Per l’avvio del sito consulta [PLESK.md](PLESK.md).
