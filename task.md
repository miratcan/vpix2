### **Prompt: Key Binding Sisteminin Yeniden Tasarlanması (Artımlı ve Güvenli Yaklaşım)**

**1. Amaç**

Bu görevin temel amacı, projedeki mevcut key binding (tuş atama) sistemini daha merkezi, test edilebilir, esnek ve sağlam bir yapıya kavuşturmaktır. Bu süreç, projenin bir daha uzun süreli test edilemez bir duruma düşmesini engelleyecek şekilde artımlı ve güvenli adımlarla ilerleyecektir.

**2. Yol Gösterici İlkeler**

*   **Artımlı ve Aşamalı İlerleme (Incremental Progress):** Refactor, tek bir büyük adımda değil, özellik gruplarına (örneğin önce gezinme, sonra basit çizim araçları) bölünerek yapılacaktır. Her aşama sonunda, testlerin tamamı çalışır durumda olacak ve bir commit atılarak stabil bir nokta oluşturulacaktır.
*   **Merkezi Tarihçe Yönetimi (Centralized History Management):** `undo/redo` mekanizmasının kararlılığını sağlamak en yüksek önceliktir. Komutların kendisi asla `history.beginGroup()` veya `history.endGroup()` çağırmamalıdır. Bu sorumluluk, tüm komutları yürüten merkezi `command-registry`'ye aittir.
*   **Sorumlulukların Ayrılması (Separation of Concerns):** UI mantığı (React bileşenleri), tuş atama mantığı (`KeymapBuilder`) ve komutların iş mantığı (`commands`) birbirinden net bir şekilde ayrılmalıdır.

**3. Hedeflenen Yeni Mimari**

*   **`core/command-registry.ts` (Yeni Sorumluluk):**
    *   Komutları yürüten `executeCommand` (veya benzeri) fonksiyon, tarihçe yönetiminin TEK merkezi olacaktır.
    *   Bu fonksiyon, asıl komutun `handler`'ını çağırmadan önce `history.beginGroup()` metodunu çağırmalıdır.
    *   `handler` çağrısı bir `try...catch` bloğu içine alınmalıdır.
        *   **Başarı Durumu (`try` bloğu sonu):** `handler` başarıyla tamamlanırsa, `history.endGroup()` çağrılarak yapılan değişiklikler `undo` yığınına eklenmelidir.
        *   **Hata Durumu (`catch` bloğu):** `handler` bir hata fırlatırsa, `endGroup` ASLA çağrılmamalıdır. Bu, yarım kalmış veya bozuk bir işlemin tarihçeye eklenmesini engeller. Hata, loglanmalı ve yukarıya tekrar fırlatılmalıdır (`throw error`).

*   **`core/services/keymap-builder.ts`:**
    *   `KeymapBuilder` sınıfı, tuş atamalarını programatik olarak tanımlamak için kullanılacak. `bind(key, command)` ve `build()` metodlarını içerecek.

*   **`src/hooks/useEngine.ts`:**
    *   `KeymapBuilder`'ı kullanarak tüm tuş atamalarını merkezi olarak tanımlayacak ve `handleKeyDown` fonksiyonunu dışarı sunacak.

*   **`src/components/Terminal/Terminal.tsx`:**
    *   İçindeki tüm klavye yorumlama mantığı temizlenerek "aptal" (dumb) bir bileşen haline getirilecek.

**4. Adım Adım Uygulama Planı**

**Faz 0: Temel Altyapı ve Merkezi Tarihçe Yönetimi**
1.  `core/command-registry.ts` içindeki komut yürütme mantığını, yukarıda `Hedeflenen Yeni Mimari` altında açıklanan `try...catch` tabanlı merkezi tarihçe yönetimiyle refactor et.
2.  Bu yeni yürütme mantığı için birim testleri yaz. Bir sahte (mock) komutun başarılı olduğunda `endGroup`'un, hata verdiğinde ise çağrılmadığını doğrula.
3.  `core/services/keymap-builder.ts` dosyasını ve iskelet `KeymapBuilder` sınıfını oluştur.
4.  Bu stabil altyapı için bir commit at: `feat(core): implement centralized history management for commands`.

**Faz 1: Salt Okunur Komutlar (Grid Gezinimi)**
1.  Sadece grid üzerinde gezinmeyi sağlayan komutları (`cursorUp`, `cursorDown` vb.) refactor et.
2.  Bu komutların `handler`'ları içinden (varsa) tüm tarihçe yönetimi çağrılarını kaldır.
3.  `useEngine.ts` içinde, bu komutları yeni `KeymapBuilder` ile tuşlara bağla.
4.  `Terminal.tsx`'i bu komutlar için basitleştir.
5.  Tüm testlerin (`npm test`) geçtiğinden emin ol.
6.  Stabil duruma ulaşıldığında bir commit at: `refactor(keys): migrate navigation commands to new keymap system`.

**Faz 2: Basit Değişiklik Yapan Komutlar (Örn: Çizim Araçları)**
1.  `LineTool` veya `StrokeRectTool` gibi basit bir çizim aracını seç.
2.  Komutun `handler`'ı içindeki tüm `beginGroup`/`endGroup` çağrılarını kaldır. Handler sadece çizim mantığını içermelidir.
3.  Komutu yeni `KeymapBuilder` ile tuşa bağla.
4.  İlgili testleri güncelle ve çalıştır.
5.  Uygulamayı tarayıcıda manuel olarak test et. Seçtiğin araçla çizim yapmayı ve **undo/redo'nun doğru çalıştığını** doğrula.
6.  Stabil duruma ulaşıldığında bir commit at: `refactor(keys): migrate simple drawing tools to new keymap system`.

**Sonraki Fazlar: Diğer Komut Grupları**
*   Yukarıdaki 2. Faz'daki süreci, aşağıdaki gibi diğer komut grupları için tekrarla. Her grup kendi commit'ini almalıdır:
    *   Daha karmaşık araçlar (`FloodFill`)
    *   Seçim (selection) komutları
    *   Palet ve renk komutları
    *   Clipboard (copy/paste) komutları

**Son Faz: Temizlik ve Nihai Doğrulama**
1.  Tüm komutlar yeni sisteme geçirildikten sonra, eski sistemden kalan kullanılmayan kodları temizle.
2.  Projedeki tüm testlerin son bir kez daha geçtiğinden emin ol.
3.  `npm run lint` ile tüm linting hatalarını düzelt.
4.  Uygulamanın tamamını manuel olarak test et.

**5. Doğrulama Adımları (Her Faz Sonunda)**

*   Tüm birim testleri `npm test` komutuyla başarıyla geçmelidir.
*   Kod, `npm run lint` komutuyla linting kurallarından hatasız geçmelidir.
*   İlgili özelliğin tarayıcıda eskisi gibi ve hatasız çalıştığı manuel olarak doğrulanmalıdır.