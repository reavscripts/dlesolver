# DLE Solver v4.4

Solver leggero compatibile con Vercel e Render. Per i sei siti supportati usa direttamente gli endpoint giornalieri e la stessa decifratura CryptoJS della rete DLE; non usa Puppeteer, Playwright o browser headless.

## Siti e modalità supportati

- OnePieceDle: Classic, Devil Fruit, Wanted, Laugh
- Narutodle: Classic, Jutsu, Quote, Eye
- LoLdle: Classic, Quote, Ability, Emoji, Splash
- Pokédle: Classic, Card, Flavor, Silhouette
- Dotadle: Classic, Quote, Ability, Loading Screen
- Smashdle: Classic, Final Smash, Kirby, Emoji, Silhouette

Ogni modalità usa il proprio endpoint `/games/<modalità>/answer` e viene restituita separatamente dalle altre.

## Avvio locale

```bash
npm install
npm run check
npm start
```

Aprire `http://localhost:3000`.

## Vercel

Importare il repository in Vercel con Framework Preset `Other`. Non è richiesto alcun comando di build.

## Render

Il file `render.yaml` è già incluso. In alternativa:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

## Endpoint

- `GET /api/solve?url=<link>&tzOffset=<minuti>`
- `GET /api/health`
- `/api/view` e `/api/proxy` restano disponibili solo come fallback per domini non mappati.

## Interfaccia dinamica

Quando viene selezionato o inserito un link supportato, il testo introduttivo viene sostituito dal logo del relativo sito e viene applicato lo sfondo dedicato.
