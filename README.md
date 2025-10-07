# VPix — Vim‑like Pixel Editor (React + Vite)

[Manifesto (VPix’in ZEN’i)](MANIFEST.md) • [Backlog (issues.md)](issues.md)

Keyboard‑only, Vim benzeri akışlarla piksel çizimi. Çekirdek motor saf JS modüllerde, UI React üzerinde. Paylaşılabilir linkler için LoSpec palet slug’ı + bit‑paketli vp2r formatı kullanılır.

Bu dosya, projenin tasarım kurallarını ve uygulanmış ilkeleri özetler.

## Tasarım İlkeleri (KISS, YAGNI, SOLID, SSOT)

### KISS (Keep It Simple, Stupid)
- Basit ve doğrudan çözümler: Render tarafında “dirty‑rect” optimizasyonu var; ancak minimap gibi küçük bileşenlerde her patch’te tam çizim yaparak sadelik ve doğruluk öncelikli.
- Tek sorumluluğa sahip küçük modüller: core/engine, core/keymap, core/url, core/palettes ayrışık.
- Ek karmaşıklığı yalnızca net fayda sağladığında ekle (ör. Canvas’ta parça parça güncelleme, ölçülebilir hız kazandırıyor).

### YAGNI (You Aren’t Gonna Need It)
- Sadece ihtiyaç duyulan özellikleri ekle. Geriye dönük URL format desteği (vp1 vb.) yok; tek format vp2r.
- Palet düzenleme yerine LoSpec paletleri: “palette use/fetch/list/search” ile kapsam sınırlı.
- Büyük soyutlamalar yerine küçük kazanımlar: Örn. Minimap’te patch bazlı yerine tam çizim yeterli ve güvenli.

### SOLID
- SRP (Single Responsibility):
  - `core/engine/`: GridState, HistoryManager, SelectionManager, EngineEvents ile orkestrasyon yapan `VPixEngine`.
  - `core/keymap.ts`: Mod/tuş → eylem dağıtımı (`engine.handleKey` delegasyonu).
- `core/url.ts`: vp2r encode/decode, base62 vb.
  - `core/services/*`: Paylaşımlı servisler (`DocumentRepository`, `ShareLinkService`, `PaletteService`).
  - `core/palettes.ts`: Palet kayıt/indirme (UI katmanından çağrılır).
- OCP (Open/Closed): Yeni tuş/komut eklemek için keymap’e satır eklemek yeterli; engine göbeği değişmez.
- LSP/ISP: Hücre rengi `null|string`; patch API yalnızca “cell” değişimlerini taşır. UI, sadece ihtiyaç duyduğu arayüzlere bağımlıdır (renderer/command).
- DIP (Dependency Inversion): Engine dış bağımlılık içermez; varsayılan palet DI ile `App`’ten verilir.

### SSOT (Single Source of Truth)
- Tek gerçek kaynak engine state’idir (grid/cursor/selection). Renderer, patch’leri yalnızca “neresi çizilecek?” ipucu olarak kullanır; renk verisini daima `engine.grid`’den okur.
- Grup işlemleri (fill/paste/line/rect/flood/move/delete) `beginGroup/endGroup` ile tek undo adımı ve tek patch emisyonu yapar; emisyon “final state”e aittir.
- Büyük patch'lerde viewport’un büyük kısmı etkilenirse full redraw fallback uygulanabilir.

## Uygulama Rehberi

### Modül Sınırları
- `core/engine/`:
  - Zorunlu DI: `new VPixEngine({ width, height, palette })` — palette dışarıdan gelir.
  - Patch üretimi: `paint/erase/move/visual ops/undo/redo` → `EngineEvents.emit({ changed: Rect[] })`
  - Undo gruplama: `beginGroup/endGroup` (fill/line/rect/flood/paste/move/delete)
- `core/keymap.ts`: Mod‑bazlı tuş dağıtımı (NORMAL/INSERT/VISUAL).
- `core/url.ts`: `encodeToParamV2R/decodeFromParamV2R` (vp2r) + yardımcılar.
- `core/commands/`: Komut yürütücüsü ve alan bazlı modüller (`DocumentRepository`/`ShareLinkService` ile SSOT).
- `core/services/*`: Ortak altyapı (paylaşım linki, yerel depolama, palet yönetimi).
- `src/hooks/*`: Motor yaşam döngüsü (`useEngine`) ve terminal (`useCommandConsole`).
- `src/components/*`: UI, render ve kompozisyon (CanvasGrid, MiniMap, Palette, StatusBar).

### Render Stratejisi
- CanvasGrid: Dirty‑rect varsa bölgesel redraw; yoksa tam redraw. Renkler engine.grid’den okunur.
- MiniMap: Her patch’te tam redraw (küçük boyut + doğruluk). Pan/zoom/size değişiminde de tam redraw.
- Overlay (cursor/selection): Her çizimde overlay en sonda yeniden çizilir.

### Test Stratejisi
- Engine unit (Mocha) ve UI akışları (Vitest + Testing Library):
  - Engine: hareket, modlar, fill/line/flood, undo/redo gruplama, url codec roundtrip.
  - UI: temel klavye akışları (`11c`, `hjkl`, `v+y/d/p`).
- jsdom ortamında canvas kullanımı mock/guard edilir (getContext yoksa çizim atlanır).

### URL Formatı (vp2r)
- `?vp2r=vp2r;w{b62};h{b62};pl{slug};d{bits};r{segments}`
- RLE segmentleri: `z<count>` (0x00 koşusu), `d<len>:<b64>` (sıfır‑dışı blok). Decode sonrası grid engine’e yazılır.

### Komutlar (Özet)
- Palet: `palette use <slug>`, `palette fetch <slug>`, `palette list`, `palette search <term>`
- Boyut: `set W <int>`, `set H <int>`, `set size <W>x<H>`
- Yükleme: `read`, `read json <{...}>`, `read url <https://...>`
- Link: `link`, `copylink` (UI tarafında vp2r üretimi)

## Katkı Kuralları
- Küçük, odaklı PR’lar: Tek sorumluluk, açık kapsam.
- Test eklemeden davranış değiştirme: Kaçın.
- Engine’e dış bağımlılık ekleme: Kaçın (DI ile çöz).

**Adlandırma Rehberi**
- React bileşenleri ve stilleri: PascalCase klasör/dosya (örn. `src/components/CanvasGrid/CanvasGrid.tsx`, `CanvasGrid.css`).
- Bileşen testleri (co-located): `ComponentName.spec.tsx` (örn. `Grid.spec.tsx`).
- Çekirdek ve servis modülleri: kebab-case (örn. `core/services/palette-service.ts`, `core/url.ts`).
- Genel testler (`test/` altında): kebab-case `*.spec.ts` kabul edilebilir.
- Hook dosyaları: `useX.ts(x)` (örn. `src/hooks/useEngine.ts`).
- Tür/ad sabitleri: Mevcut modülün adlandırmasını takip eder; ekstra önek/sonek eklemeyin.

## Çalıştırma
- Dev: `npm run dev`
- Test: `npm test` (Vitest)
- Test (watch): `npm run test:watch`
- Build: `npm run build`

## Notlar
- VPix, Vim benzeri klavye-odaklı bir editördür; mouse etkileşimleri (drag, wheel vb.) tasarım gereği desteklenmez.
- Pan davranışı: Viewport, imleci (cursor) otomatik takip eder. Büyük tuvallerde `hjkl` ile imleci hareket ettirdiğinizde görüntü kenara yaklaşınca kayar; ayrıca ayrı bir pan modu yoktur.

Not: Kısayol ilkeleri ve “tek yol” felsefesi için bkz. MANIFEST.md.
