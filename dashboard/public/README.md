# Logo & Icons hier ablegen

Leg deine Designer-Dateien in **diesen Ordner** (`public/`). Sie sind dann unter
`/dateiname` erreichbar (z. B. `/logo.svg`).

## Was hier reingehört
| Datei | Größe | Wofür |
| --- | --- | --- |
| `logo.svg` | beliebig (Vektor) | Haupt-Logo (Navbar, Footer) — **ersetze die Platzhalter-Datei** |
| `icon.png` | 512×512 | Symbol/„H" allein — Favicon & Discord-Avatar |

## Favicon (Browser-Tab)
Lege zusätzlich `icon.png` (512×512) NICHT hier, sondern in **`app/icon.png`** ab —
Next.js erzeugt daraus automatisch das Favicon.

## Aktueller Stand
`logo.svg` ist gerade ein **Platzhalter** (das bestehende „H"-Logo). Einfach mit
der echten Datei überschreiben — gleicher Dateiname, dann muss am Code nichts
geändert werden (sobald die Components auf `/logo.svg` umgebaut sind).
