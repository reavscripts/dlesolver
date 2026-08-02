# Changelog

## 4.2.0

- Esteso l'adattatore diretto a Narutodle, LoLdle, Pokédle, Dotadle e Smashdle.
- Aggiunti 26 mapping distinti tra percorso e endpoint giornaliero.
- Supportati endpoint camelCase come `devilFruit`, `loadingScreen` e `finalSmash`.
- Aggiunta cache ufficiale come fallback per ciascun sito.
- Aggiunti campi risposta specifici: champion, character, Pokémon, hero e fighter.
- Disattivato il fallback iframe per i sei siti supportati, evitando risposte Classic duplicate.
- Test automatici con 26 payload cifrati distinti.
