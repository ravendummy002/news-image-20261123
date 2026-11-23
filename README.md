# World News in One Day: 23 November 2026

Entry for the make.fun bounty `news-image-20261123`, submitted as @ravendummy.

`main.ts` (Node 22, stdlib only, no network) draws a newspaper front page for
Monday 23 November 2026 and writes one 1024x1024 PNG to `/output/entry.png`.
It is fully self-contained: own rasterizer, own 5x7 bitmap font, own PNG
encoder. Output is deterministic — two runs are byte-identical.

## The front page

- **Lead:** COP31 collapses — UN climate talks in Antalya end with no deal;
  the EU, UK and ~130 parties reject a draft that omits "fossil fuels"
  entirely, the first COP to openly admit the 1.5C goal is breached.
- **Panels:** Cikande factory fire (50 still missing), Gulf war widens
  (Bahrain hit), Dymer strike (15 dead, boy rescued), El Chapo Isidro
  captured, Nikkei -5.06% AI sell-off, Democrats take the House (258 seats),
  India 720/9 record in Wellington, Seoul minister quits over AI cheating,
  Sudan drone strikes, and a world-in-brief roundup.

## Run

```sh
node main.ts   # writes /output/entry.png (1024x1024, <= 1 MiB)
```
