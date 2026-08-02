# Changelog

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
