# DLE Solver v5.3

Solver leggero compatibile con Vercel e Render. Supporta 63 modalità giornaliere su 20 siti DLE e aggregatori di indovinelli tramite endpoint o adattatori che replicano la rotazione ufficiale; non usa Puppeteer, Playwright o browser headless.

La versione 5.3 include:

- catalogo diviso in modo chiaro tra giochi DLE/personaggi e indovinelli giornalieri;
- supporto a Riddles.com, RiddleDay, Riddle Time e Riddle Cafe;
- lettura delle singole pagine numeriche dell’archivio Riddles.com oltre alle dieci nuove modalità giornaliere;

- conto alla rovescia prima della visualizzazione della risposta;
- spazio pubblicitario durante l’attesa;
- pausa automatica del timer quando la scheda non è visibile;
- abbonamento PayPal Premium per saltare attesa e pubblicità;
- verifica server-side dello stato `ACTIVE` e del piano PayPal configurato;
- quattro versioni indicizzabili: inglese su `/`, italiano su `/it/`, francese su `/fr/` e spagnolo su `/es/`;
- rilevamento automatico della lingua del browser al primo accesso dalla home;
- preferenza manuale EN/IT/FR/ES salvata in `localStorage` e sempre prioritaria;
- SEO multilingua con canonical, `hreflang`, sitemap, Open Graph e dati strutturati.
- interfaccia “daily game hub” con comando principale compatto, catalogo a schede, identità visive per franchise e layout responsive;
- foglio di stile condiviso tra le quattro lingue, senza modifiche alla logica del solver.
- campo di ricerca compatto integrato nella barra superiore quando il pannello principale esce dallo schermo, sincronizzato con il form originale.

## Siti e modalità supportati

- OnePieceDle: Classic, Devil Fruit, Wanted, Laugh
- Narutodle: Classic, Jutsu, Quote, Eye
- LoLdle: Classic, Quote, Ability, Emoji, Splash
- Pokédle: Classic, Card, Flavor, Silhouette
- Dotadle: Classic, Quote, Ability, Loading Screen
- Smashdle: Classic, Final Smash, Kirby, Emoji, Silhouette
- Bleachdle: Classic, Wordly
- Jujutsudle: Classic (la modalità usa la home `https://jujutsudle.com/`), Jujutsu Point, Wordly
- Narutodle.org: Classic, NarutoPoint, Wordly, Uzumakidle
- Kimetsudle: Classic, Wordly
- Jojodle: Classic, JoJoPoint, Wordly, Joestardle
- Bluelockdle: Classic, Wordly
- Genshindle: Wordly, Genshinle Daily, Paimordle
- Animedle Onepiecedle: Classic, Wordly
- Animedle Dragonballdle: Classic, Wordly
- OPMdle: Classic, Wordly
- Pokentions: Daily Connections
- Riddles.com: Riddle of the Day, RiRdle e pagine numeriche dell’archivio
- RiddleDay: Adults/Kids nei livelli Easy, Medium e Hard
- Riddle Time: Daily Riddle
- Riddle Cafe: Daily Riddle

Le prime 26 modalità usano il rispettivo endpoint `/games/<modalità>/answer`. Gli altri adattatori leggono esclusivamente dati, pagine e bundle pubblici e replicano la loro logica giornaliera: giorno dell’anno per i Classic, archivi datati per le modalità Point, rotazioni Wordly e riddle, archivi di frasi per Uzumakidle e Joestardle, seed giornaliero per Genshinle Daily e numero progressivo per Pokentions.

Genshindle e OPMdle includono inoltre una copia locale verificata dei dati di rotazione: viene usata automaticamente soltanto quando il sito originale blocca le richieste provenienti dalla rete di deployment.

Non sono incluse le modalità Unlimited, Endless, Match e altri giochi casuali privi di una risposta giornaliera stabile. Per lo stesso motivo Cupcakes 2048, pur essendo collegato da Jujutsudle, non viene trattato come un DLE risolvibile.

## Avvio locale

```bash
npm install
npm run check
npm start
```

Aprire `http://localhost:3000`.

## Configurazione monetizzazione

Copiare `.env.example` nei parametri d’ambiente della piattaforma. In locale è possibile impostarli nel terminale o usare il sistema di environment preferito.

```env
ANSWER_WAIT_SECONDS=60
MONETIZATION_SECRET=una-chiave-casuale-di-almeno-24-caratteri
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_PLAN_ID=...
ADSENSE_CLIENT_ID=ca-pub-...
ADSENSE_SLOT_ID=...
```

### Protezione del timer

Impostare `MONETIZATION_SECRET` con una stringa casuale di almeno 24 caratteri. Per generarne una:

```bash
openssl rand -base64 48
```

Quando questa variabile è presente, l’endpoint `/api/solve` non invia la risposta gratuita al browser: restituisce un token cifrato, che `/api/reveal` può aprire soltanto dopo l’attesa. Senza questa variabile il timer continua a funzionare, ma resta una protezione solo frontend e quindi più facile da aggirare.

### PayPal

1. Creare un’app PayPal Business in modalità Sandbox.
2. Creare un prodotto e un piano di abbonamento ricorrente.
3. Inserire Client ID, Client Secret e Plan ID nelle variabili d’ambiente.
4. Lasciare `PAYPAL_ENV=sandbox` durante i test.
5. Per la produzione usare credenziali e piano Live, quindi impostare `PAYPAL_ENV=live`.

Il Client Secret resta esclusivamente nel backend. Dopo l’approvazione del pagamento, `/api/paypal-verify` interroga PayPal e abilita Premium soltanto quando lo stato è `ACTIVE` e il `plan_id` coincide con `PAYPAL_PLAN_ID`.

Senza un sistema di account, il ripristino automatico è legato al browser tramite l’ID dell’abbonamento salvato in `localStorage`. Per associare definitivamente l’abbonamento a una persona e impedirne la condivisione serve aggiungere login e database.

### Pubblicità

Il progetto supporta un’unità display Google AdSense configurata con `ADSENSE_CLIENT_ID` e `ADSENSE_SLOT_ID`. Senza questi valori viene mostrato un segnaposto, così il flusso può essere provato prima dell’approvazione del circuito pubblicitario.

Non obbligare l’utente a cliccare l’annuncio. Prima della pubblicazione verificare che il formato, la posizione e il meccanismo di attesa rispettino le regole correnti del circuito scelto.

## Vercel

Importare il repository in Vercel con Framework Preset `Other`. Non è richiesto alcun comando di build. Aggiungere tutte le variabili nella sezione Environment Variables e ridistribuire il progetto.

## Render

Il file `render.yaml` è già incluso. In alternativa:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Aggiungere le variabili nella sezione Environment del servizio.

## Endpoint

- `GET /api/solve?url=<link>&tzOffset=<minuti>`
- `GET /api/health`
- `GET /api/config`
- `POST /api/paypal-verify` con JSON `{ "subscriptionId": "..." }`
- `POST /api/reveal` con JSON `{ "revealToken": "..." }`
- `/api/view` e `/api/proxy` restano disponibili solo come fallback per domini non mappati.

## Interfaccia dinamica

Quando viene selezionato o inserito un link supportato, il testo introduttivo viene sostituito dal logo del relativo sito e viene applicato lo sfondo dedicato.


## Lingua automatica

La home inglese (`/`) legge `navigator.languages` e reindirizza alla variante italiana, francese o spagnola quando il browser dichiara una di queste lingue. Non viene usata la geolocalizzazione. Quando l’utente sceglie manualmente EN, IT, FR o ES, la preferenza viene salvata nel browser come `dleLanguagePreference` e prevale sul rilevamento automatico.


## PayPal button theme

The Premium dialog uses the black PayPal subscription button inside a dark container to match the site theme.
