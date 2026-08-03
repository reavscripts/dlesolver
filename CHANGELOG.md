# Changelog

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
