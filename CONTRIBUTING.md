## Katkı Rehberi

Teşekkürler! Lütfen şu prensiplere uyun:

- Kapsamı küçük ve odaklı tutun; ilişkisiz değişiklik eklemeyin.
- Davranış değişikliklerine test ekleyin veya mevcut testleri güncelleyin.
- Engine’e dış bağımlılık eklemeyin; gerekirse DI ile `App` katmanında sağlayın.

### Adlandırma Rehberi
- Bileşenler: PascalCase klasör ve dosya adları (`CanvasGrid/CanvasGrid.tsx`).
- Bileşen testleri: Aynı klasörde `ComponentName.spec.tsx`.
- Çekirdek/servis modülleri: kebab-case (`core/url.ts`, `core/services/palette-service.ts`).
- Genel testler: `test/*.spec.ts` (kebab-case kabul).
- Hook’lar: `useX.ts(x)` (`useEngine.ts`).

### Test ve Araçlar
- Testleri çalıştır: `npm test` (tek sefer), `npm run test:watch` (watch).
- Lint: `npm run lint`.

