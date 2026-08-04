# Changelog

## 5.3.0

- Expanded direct support from 16 websites and 53 modes to 20 websites and 63 daily modes.
- Added Riddles.com Riddle of the Day, RiRdle and direct extraction from numeric archive pages.
- Added all six RiddleDay rotations for adults and kids across easy, medium and hard difficulty.
- Added Riddle Time daily answers from its public page data and Riddle Cafe answers from its structured FAQ data.
- Split the multilingual catalog into DLE/character games and daily riddle hubs, with dedicated responsive cards.
- Added reusable parsers for inline riddle rotations, HTML answer panels, Next.js page data and JSON-LD questions.

## 5.2.1

- Reworked the docked-search transition as a scroll-linked liquid merge between the main solver panel and the floating top bar.
- Added a shrinking droplet shell, a soft connecting bridge and a progressive reveal of the compact search field.
- Covered the sticky top gap during the merge so the original form no longer leaves visible fragments behind.
- Preserved the existing mobile cutoff, keyboard behavior and reduced-motion fallback.

## 5.2.0

- Added a compact search field that docks into the floating top bar after the main solver panel leaves the viewport.
- Kept the docked field synchronized with the original form and routed submissions through the existing solver logic.
- Added a subtle entrance transition, loading feedback, keyboard support and an automatic return to the answer panel.
- Localized the docked controls in English, Italian, French and Spanish, with a non-intrusive mobile cutoff and reduced-motion support.

## 5.1.0

- Redesigned the interface as a focused daily-game hub without changing solver, Premium, timer or theme-selection logic.
- Added a compact command deck, live coverage indicators and clearer task-oriented copy in all four languages.
- Reworked the 16-game catalog into a denser responsive grid with franchise art, individual accent colors and improved mode controls.
- Added stronger focus states, reduced-motion support, responsive breakpoints and a shared `ui-v6.css` presentation layer.
- Refined selected-game backgrounds, content contrast, result styling and mobile stacking.

## 5.0.0

- Expanded the solver from 31 to 53 verified daily modes and from 8 to 16 site configurations.
- Added Narutodle.org Classic, NarutoPoint, Wordly and Uzumakidle.
- Added Kimetsudle Classic and Wordly; Jojodle Classic, JoJoPoint, Wordly and Joestardle; Bluelockdle Classic and Wordly.
- Added Genshindle Wordly, Genshinle Daily and Paimordle.
- Added Animedle Onepiecedle Classic/Wordly and Dragonballdle Classic/Wordly.
- Added OPMdle Classic/Wordly and Pokentions Daily Connections.
- Added parsers for publisher character bundles, dated category archives, phrase archives, timestamp word lists, seeded Genshin abilities and four-group Connections puzzles.
- Added verified local rotation fallbacks for Genshindle and OPMdle when their servers reject requests from the deployment network.
- Added official backgrounds and logos, path-aware Animedle themes and direct-host detection to all four language pages.
- Excluded Unlimited, Endless, Match, random and non-daily games such as Cupcakes 2048.
- Expanded synthetic checks to every new URL and all 53 supported modes.

## 4.12.0

- Added Jujutsudle Wordly as the 31st supported daily riddle.
- Added a dedicated adapter for `https://jujutsudle.com/jujutsu-wordly.htm` that reads the official `jujutsudlev2.js` solution list.
- Matched the game's local calendar rotation and kept its cache isolated from Jujutsudle Classic and Jujutsu Point.
- Added Wordly links to all four language pages and expanded automated checks to 31 modes.

## 4.11.0

- Added Jujutsu Point as the 30th supported daily riddle.
- Added a dedicated adapter for `https://jujutsudle.com/jujutsupoint/` that reads the official dated puzzle archive.
- Matched the site's local `YYYY-MM-DD` selection and previous-puzzle fallback behavior.
- Added Jujutsu Point links to all four language pages and expanded automated checks to 30 modes.

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
