Elbette, projenin yapısını ve çalışma mantığını dosya düzenine göre analiz edip dokümante edebilirim. Bu proje, modern bir web uygulaması olup, temel olarak bir "headless" (arayüzden bağımsız) çekirdek motoru ve bu motoru kullanan bir React tabanlı kullanıcı arayüzünden oluşuyor.

İşte projenin detaylı bir dökümantasyonu:

### Genel Bakış

Bu proje, tarayıcıda çalışan bir piksel sanat (pixel art) editörüdür. Temel teknolojiler olarak **TypeScript**, **React** ve **Vite** kullanmaktadır.

Projenin en dikkat çekici ve güçlü mimari özelliği, **Sorumlulukların Ayrılması (Separation of Concerns)** ilkesine sıkı sıkıya bağlı kalmasıdır. Bu, iki ana katmanla sağlanmıştır:

1.  **`core/` (Çekirdek Motor):** Uygulamanın tüm mantığını, durum yönetimini ve işlevselliğini içeren, kullanıcı arayüzünden tamamen bağımsız bir katmandır. Bu katman React veya DOM hakkında hiçbir şey bilmez. Saf TypeScript ile yazılmıştır.
2.  **`src/` (Kullanıcı Arayüzü):** React kullanılarak oluşturulmuş, kullanıcının gördüğü ve etkileşimde bulunduğu katmandır. Bu katmanın ana görevi, `core` motorundan gelen durumu görselleştirmek ve kullanıcı etkileşimlerini (tıklama, klavye girişi vb.) motora komut olarak iletmektir.

---

### Ana Mimari ve Tasarım Desenleri

1.  **Headless Engine (Arayüzden Bağımsız Motor):**
    *   **Nerede?** `core/` dizini.
    *   **Nasıl Çalışır?** Bu motor, uygulamanın beynidir. Tuvalin durumu (`grid-state.ts`), yapılan işlemlerin geçmişi (geri al/ileri al için `history.ts`), seçimler (`selection.ts`) gibi tüm verileri yönetir. Çizim araçlarının (çizgi, daire, doldurma) mantığı (`core/tools/`) ve kullanıcı eylemlerinin soyutlamaları (`core/commands/`) burada bulunur.
    *   **Avantajı:** Bu mimari sayesinde, çekirdek mantık UI'dan bağımsız olarak test edilebilir (`test/` dizinindeki testler bunu doğrular), yeniden kullanılabilir ve hatta gelecekte farklı bir UI (örneğin bir mobil uygulama veya masaüstü uygulaması) ile kullanılabilir.

2.  **Command Pattern (Komut Deseni):**
    *   **Nerede?** `core/commands/` dizini.
    *   **Nasıl Çalışır?** Kullanıcının yapabileceği her eylem (örneğin, bir pikseli boyamak, bir alanı seçmek, geri almak) ayrı bir "komut" olarak tanımlanmıştır. Örneğin, `paint.ts` komutu bir pikseli boyama mantığını içerir. Bu komutlar, `command-registry.ts` üzerinden yönetilir.
    *   **Avantajı:** Bu desen, geri al/ileri al (`undo/redo`) işlevselliğini (`core/engine/history.ts`) çok kolaylaştırır. Her komut, kendisini nasıl geri alacağını da bilir. Ayrıca, komutların bir listesi tutularak kullanıcı eylemlerinin tekrar oynatılması veya bir makro sistemi kurulması mümkün hale gelir.

3.  **Bridge Pattern (Köprü Deseni) - React Hooks ile:**
    *   **Nerede?** `src/hooks/useEngine.ts`.
    *   **Nasıl Çalışır?** `core` motoru ile `src`'deki React bileşenleri arasındaki bağlantıyı bu özel hook sağlar. `useEngine` hook'u, motorun bir örneğini oluşturur, motorun durum değişikliklerini dinler (muhtemelen bir olay/abone sistemi ile - `core/engine/events.ts`) ve durum değiştiğinde React'in yeniden render edilmesini tetikler. Aynı zamanda, UI bileşenlerinden gelen kullanıcı eylemlerini alıp motorun anlayacağı komutlara çevirerek motora gönderir.

---

### Detaylı Dizin Yapısı ve İşlevleri

*   **`/` (Kök Dizin):**
    *   `package.json`: Proje bağımlılıklarını (React, Vite) ve script'leri (çalıştırma, build, test) tanımlar.
    *   `vite.config.js`: Vite tabanlı build ve geliştirme sunucusu ayarları.
    *   `tsconfig.json`: TypeScript derleyici ayarları.
    *   `index.html`: Uygulamanın giriş HTML dosyası.

*   **`core/` (Çekirdek Motor):**
    *   `engine/`: Uygulamanın durum yönetimi merkezi.
        *   `state.ts`: Ana durum (state) yöneticisi.
        *   `grid-state.ts`: Piksel tuvalinin matris verisini tutar.
        *   `history.ts`: Geri al/ileri al yığınını (stack) yönetir.
        *   `selection.ts`: Kullanıcının seçtiği alanları yönetir.
    *   `commands/`: Kullanıcı eylemlerini tanımlayan komutlar (Command Pattern).
    *   `tools/`: Çizim araçlarının algoritmaları (Bresenham çizgi algoritması vb.).
    *   `services/`: Daha üst seviye servisler (örneğin, döküman kaydetme/yükleme, paylaşım linki oluşturma).
    *   `command-registry.ts`: Komutları kaydeden ve çalıştıran merkezi birim.

*   **`src/` (React UI Katmanı):**
    *   `main.tsx`: React uygulamasını `index.html`'deki root elementine bağlayan başlangıç noktası.
    *   `App.tsx`: Ana uygulama bileşeni. Tüm diğer UI bileşenlerini bir araya getirir ve `useEngine` hook'unu kullanarak motorla iletişim kurar.
    *   `components/`: Tekrar kullanılabilir React bileşenleri.
        *   `CanvasGrid/`: Piksel tuvalini render eden bileşen.
        *   `Palette/`: Renk paletini gösteren bileşen.
        *   `StatusBar/`: Durum çubuğu (koordinatlar, mevcut araç vb.).
        *   `Terminal/`: Muhtemelen komutları metin olarak girmek için bir arayüz.
    *   `hooks/`: Özel React hook'ları.
        *   `useEngine.ts`: `core` ve `src` arasındaki en kritik bağlantı noktası.

*   **`test/`:**
    *   Çekirdek motorun (`core`) işlevselliğini test eden birim ve entegrasyon testleri. Bu testler UI'dan tamamen bağımsızdır ve motorun doğru çalıştığını garantiler.

### İşleyiş Akışı (Örnek Senaryo: Kullanıcı Bir Piksel Çizer)

1.  Kullanıcı, fare ile `src/components/CanvasGrid/CanvasGrid.tsx` bileşeni üzerinde bir yere tıklar.
2.  `CanvasGrid` bileşeninin `onClick` olay dinleyicisi tetiklenir ve tıklanan (x, y) koordinatlarını alır.
3.  Bu bileşen, `useEngine` hook'undan aldığı bir fonksiyonu (örneğin `engine.dispatchCommand(...)`) çağırır ve eylemin türünü ('paint'), koordinatları ve mevcut rengi bu fonksiyona parametre olarak geçer.
4.  `useEngine` hook'u bu bilgiyi alıp `core` motorundaki `command-registry`'ye iletir.
5.  `command-registry`, 'paint' komutunu bulur ve çalıştırır.
6.  `PaintCommand`, `core/engine/grid-state.ts` içindeki tuval verisini günceller.
7.  Bu işlem, `core/engine/history.ts`'e bir "undo" adımı olarak eklenir.
8.  Motorun durumu değiştiği için, motor bir `stateChanged` olayı yayınlar.
9.  `useEngine` hook'u bu olayı dinlemektedir. Olayı yakaladığında, motorun güncel durumunu alır ve kendi React state'ini günceller.
10. React state'i güncellendiği için `App.tsx` ve altındaki `CanvasGrid.tsx` gibi bileşenler yeniden render edilir ve kullanıcı yeni çizdiği pikseli ekranda görür.

Bu yapı, son derece modüler, test edilebilir ve bakımı kolay bir uygulama ortaya çıkarmaktadır. Özellikle `core` ve `src` ayrımı, projenin en güçlü yanıdır.
