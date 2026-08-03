# Changelog

## 4.10.0

- Added Jujutsudle Classic as the 29th supported daily riddle and the eighth supported website.
- Normalized `https://jujutsudle.com/` and `/jujutsukaisen.html` to the same Classic mode.
- Added a direct adapter that reads the official Next.js character bundle and applies the site's local day-of-year rotation.
- Added the original Jujutsudle logo and responsive background to all four language pages.
- Expanded automated checks to eight sites and 29 daily modes.

## 4.9.0

- Added Bleachdle Wordly as the 28th supported daily riddle.
- Added a dedicated parser for the 80 Wordly solutions and the official daily rotation formula from `bleachlev2.js`.
- Changed the Bleachdle Classic example URL from the wrapper home page to `https://bleachdle.org/bleach.html`.
- Added the exact Wordly URL `https://bleachdle.org/bleach-wordly.htm` to all four language pages.
- Expanded automated checks to seven sites and 28 daily modes.
- Kept Bleachdle Unlimited disabled because it is not a daily riddle.

## 4.8.0

- Added Bleachdle Classic as the 27th supported daily riddle.
- Added a dedicated Bleachdle adapter that reads the official Next.js character bundle and applies the game's day-of-year selection logic.
- Added Bleachdle cards, direct-host detection, logo and background to all four language pages.
- Expanded automated checks to seven sites and 27 daily modes.
- Kept Bleachdle Wordly and Unlimited disabled until their separate game logic is captured and verified.

## 4.7.1

- Changed the PayPal subscription button to the black theme for the dark Premium dialog.
- Limited the checkout launcher to the PayPal funding button to prevent light alternate-funding buttons.
- Added a dark, bordered PayPal container with transparent iframe handling on all four language pages.

## 4.7.0

- Added fully localized French (`/fr/`) and Spanish (`/es/`) versions.
- Expanded the language selector to EN, IT, FR and ES.
- Added automatic browser-language selection from the x-default home page.
- Manual language choices are saved in `localStorage` and take priority.
- Expanded canonical, hreflang, Open Graph, JSON-LD, sitemap and routing checks to all four languages.

## 4.6.0

- English is now the default language at `/`.
- Italian remains available at `/it/` with a visible language selector.
- Added localized runtime messages and PayPal SDK locale.
- Added canonical URLs, hreflang, Open Graph, Twitter metadata and JSON-LD.
- Added `robots.txt`, multilingual `sitemap.xml` and indexable explanatory content.

## 4.5.0

- Aggiunto timer configurabile prima della visualizzazione della risposta.
- Aggiunto spazio pubblicitario AdSense opzionale durante l’attesa.
- Aggiunto abbonamento PayPal Premium con verifica server-side di stato e piano.
- Aggiunta protezione server-side con token AES-256-GCM per le risposte gratuite.
- Aggiunti endpoint `/api/config`, `/api/paypal-verify` e `/api/reveal` per Vercel e Render.
- Aggiunta configurazione tramite variabili d’ambiente e file `.env.example`.

## 4.4.0

- Aggiunti i loghi dedicati per OnePieceDle, Narutodle, LoLdle, Pokédle, Dotadle e Smashdle.
- Il testo introduttivo viene sostituito automaticamente dal logo del sito quando si seleziona o si incolla un link supportato.
- Transizione morbida e layout responsive dei loghi.
- Motore diretto v4.2 invariato.

## 4.3.0

- Background dinamico dedicato per OnePieceDle, Narutodle, LoLdle, Pokédle, Dotadle e Smashdle.
- Cambio automatico dello sfondo quando si clicca un esempio, si incolla o si digita un link supportato.
- Transizione incrociata tra gli sfondi e overlay per mantenere leggibile l'interfaccia.
- Motore diretto v4.2 invariato.

## 4.2.0

- Esteso l'adattatore diretto a Narutodle, LoLdle, Pokédle, Dotadle e Smashdle.
- Aggiunti 26 mapping distinti tra percorso e endpoint giornaliero.
- Supportati endpoint camelCase come `devilFruit`, `loadingScreen` e `finalSmash`.
- Aggiunta cache ufficiale come fallback per ciascun sito.
- Aggiunti campi risposta specifici: champion, character, Pokémon, hero e fighter.
- Disattivato il fallback iframe per i sei siti supportati, evitando risposte Classic duplicate.
- Test automatici con 26 payload cifrati distinti.
