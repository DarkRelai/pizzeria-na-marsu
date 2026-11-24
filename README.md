# Pizzerie na Marsu

## Popis hry

**Pizzerie na Marsu** je 2D platformová hra vytvořená jako školní AI Challenge. Hráč ovládá kuchaře, který musí projít marsovskými úrovněmi, sbírat kousky pizzy, mince a power-upy a doručit pizzu až do pizzerie. Na cestě jsou nepřátelé, lasery, bodce, kyselina a na konci také boss Robokuchař.

Hra obsahuje:

- 8 úrovní s postupným odemykáním,
- kontrolní body, životy, skóre a měření času,
- tři hvězdy za každou úroveň,
- souboj s bossem Robokuchařem,
- český a anglický jazyk,
- nastavení hlasitosti, fullscreen a uložení postupu do `localStorage`,
- ovládání klávesnicí, myší i dotykovými tlačítky na telefonu.

## Ovládání

| Akce | Klávesy |
|---|---|
| Pohyb doleva/doprava | šipky vlevo/vpravo nebo `A`/`D` |
| Skok | `Space`, `W`, `Z`, `J`, `K` nebo šipka nahoru |
| Lezení | šipka nahoru/dolů nebo `W`/`S` |
| Pauza | `Esc` nebo `P` |
| Výběr v menu | myš, šipky a `Enter` |

Na dotykovém zařízení se během hry zobrazí virtuální tlačítka.

## Spuštění

### Windows - doporučený způsob

1. Rozbalte nebo naklonujte celý repozitář.
2. Otevřete soubor **`Start Pizzeria on Mars.bat`**.
3. Hra se otevře v prohlížeči na adrese `http://localhost:8123`.
4. Pro ukončení zavřete okno místního serveru.

### Ruční spuštění

Je potřeba Python 3:

```text
python -m http.server 8123
```

Potom otevřete <http://localhost:8123>. Hru lze někdy otevřít i přímo přes `index.html`, ale místní server je spolehlivější kvůli načítání assetů.

### Spuštění bez Pythonu

Pokud nechcete instalovat Python, otevřete **`Start Pizzeria on Mars - bez Pythonu.bat`**. Ten spustí hru přímo přes `index.html` v předvoleném prohlížeči. Pokud prohlížeč zobrazí bezpečnostní omezení lokálních souborů, použijte doporučený způsob s Pythonem.

## Použité technologie

- HTML5
- JavaScript bez frameworku
- HTML5 Canvas 2D
- CSS
- Web Audio API pro hudbu a zvukové efekty
- `localStorage` pro uložení postupu
- Python `http.server` pouze pro lokální spuštění

## Ruční testovací scénář

1. Spusťte hru přes `Start Pizzeria on Mars.bat`.
2. Na hlavní obrazovce zvolte **Hrát** a ověřte, že se zobrazí mapa.
3. Otevřete první úroveň a ověřte pohyb vlevo/vpravo a skok.
4. Sesbírejte minci nebo kousek pizzy a ověřte změnu počítadla.
5. Nechte postavu zasáhnout překážkou a ověřte ztrátu života nebo návrat ke kontrolnímu bodu.
6. Stiskněte `P` nebo `Esc`, ověřte pauzu a následně pokračování.
7. Dokončete úroveň a ověřte obrazovku **Pizza doručena!** a odemčení další úrovně.
8. V menu otevřete **Jak hrát**, **Nastavení** a změnu jazyka.
9. Obnovte stránku a ověřte, že se postup zachoval.
10. Na telefonu nebo v emulaci dotykového zařízení ověřte zobrazení dotykových tlačítek.

## Struktura projektu

```text
index.html                 vstupní stránka hry
css/style.css              vzhled stránky a canvasu
js/core.js                 vstup, lokalizace, save a canvas
js/game.js                 herní logika a kolize
js/levels.js               definice úrovní
js/screens.js              menu, mapa, nastavení a herní obrazovky
js/art.js                  kreslení grafiky
js/audio.js                hudba a zvuky
assets/                    obrázky a manifest assetů
docs/                      design a odevzdávané dokumenty
```

## Autoři a Git historie

Jména autorů a jejich skutečné GitHub účty doplňte před odevzdáním. Každý člen týmu by měl vytvářet commity pod vlastním jménem a e-mailem. Doporučený formát zpráv:

```text
feat: add level selection
fix: prevent player from falling through platforms
docs: describe manual test scenario
```

## Odevzdávané dokumenty

- [Design dokument](docs/design.md)
- [Deník selhání AI](docs/ai-failure-log.md)
- [Individuální retrospektiva](docs/retrospective.md)
