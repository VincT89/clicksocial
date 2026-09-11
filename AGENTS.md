# ClickSocial locale

Il progetto usa React/Vite e un backend Node con SQLite oppure MySQL/MariaDB, selezionato da DB_DRIVER. L'app non ha dipendenze runtime da Base44.

- Leggere README.md per avvio, configurazione e limiti verificati.
- Usare npm run local per compilare e avviare l'app su http://127.0.0.1:5180; npm run dev è disponibile per sviluppo con Vite.
- Tenere segreti e dati personali in .env e data/, esclusi dal controllo versione.
- Leggere MYSQL.md prima di trasferire dati o cambiare database. Non sovrascrivere destinazioni già popolate e conservare data/uploads e data/.encryption-key.
- Le operazioni del database sono asincrone: attendere query e transazioni. Usare server/database.mjs e le varianti SQL esplicite in server/sql.mjs.
- npm test usa database SQLite isolati. npm run test:mysql avvia un server SQL temporaneo tramite MYSQL_TEST_SERVER e non usa il database configurato per l'app.
- Non simulare servizi esterni mancanti. Mostrare gli errori di configurazione.
- Verificare npm test, npm run build, npm run lint e i flussi nel browser.
- work/original-base44 contiene solo il riferimento esportato e non va eseguito.
