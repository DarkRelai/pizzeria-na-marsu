# Design dokument

## Herní koncept

Hráč je kuchař na Marsu. Pizzerii ohrožuje Robokuchař, který ukradl recept. Cílem je projít osmi úrovněmi, posbírat ingredience a doručit pizzu do pizzerie.

## Herní smyčka

1. Hráč si vybere odemčenou úroveň.
2. Pohybuje se po platformách, sbírá předměty a vyhýbá se nebezpečí.
3. Při zásahu ztratí život a vrací se ke kontrolnímu bodu.
4. Po dosažení cíle získá hvězdy podle splněných výzev.
5. Další úroveň se odemkne po dokončení předchozí.

## Úrovně a obtížnost

Úrovně postupně přidávají nové prvky: nepřátele, pohyblivé překážky, lasery, kyselinu, odrazové plošiny a nakonec bosse. Každá úroveň má cíl, kousky pizzy, mince a volitelné hvězdy.

## Vizuální styl

Styl kombinuje neonové marsovské prostředí, teplé oranžové barvy a výrazné kreslené postavy. Grafika je vykreslována na HTML5 canvasu a doplněna připravenými sprite obrázky.

## Technický návrh

- `core.js` řeší canvas, vstup, lokalizaci a ukládání.
- `game.js` obsahuje stav hráče, fyziku, kolize, nepřátele a projektily.
- `levels.js` obsahuje data map.
- `screens.js` řídí menu, mapu, nastavení, pauzu a přechody.
- `art.js` kreslí herní objekty.
- `audio.js` vytváří hudbu a zvukové efekty pomocí Web Audio API.

Hra nevyžaduje instalaci balíčků ani externí backend.

## Kritéria hotového produktu

Hra se spustí podle README, má jasné ovládání, několik hratelných úrovní, uložení postupu, ruční testovací scénář a dokumentaci k návrhu i použití AI.
