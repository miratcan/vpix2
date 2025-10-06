# VPix’in ZEN’i (Manifesto)

Bu manifesto, VPix (Vim‑benzeri piksel editörü) için karar alma pusulasıdır. Hedefimiz: klavye‑odaklı, akıcı, link‑paylaşımıyla taşınabilir bir yaratıcılık deneyimi.

## 1. Anında Tatmin
- Uygulama açılır açılmaz 30 saniye içinde ilk piksel boyanabilmeli.
- Varsayılan fokus, tek tuşla (i → Space) boyamaya akmalı.
- Öğrenme için “:help” ve “:tutorial 60s” gibi rehberler terminalde, ek modal gerektirmeden sunulur.

## 2. Sürtünmesiz Paylaşım
- Eser paylaşımı tek bir link ile yapılır (vp2r param’ı). Alıcı, sadece linke gider ve görüntüler.
- “copylink”/“link” ile URL güncelleme ve panoya kopyalama akışları temel birinci sınıf özelliktir.
- (Opsiyonel) “copy png(+link)” ile görsel + gömülü/ilişik link paylaşımı.

## 3. Keşfedilebilir Arayüz
- Kullanıcı öğretici okumadan temel akışları “hissetmeli”.
- Yardım ve kullanım ipuçları komut konsolunda (“:help”, “:help <prefix>”, “Tab” tamamlama) erişilebilir.
- UI minimaldir; derinlik terminal komutlarıyla açılır.

## 4. Kademeli Karmaşıklık
- Başlangıçta tek tuval + temel komutlar. İhtiyaca göre kademeli yetenekler (ör. frames, layers, tileset) eklenir.
- Gelişmiş seçenekler (örn. gelişmiş komutlar/parametreler) terminal üzerinden isteğe bağlıdır; acemiyi boğmaz.

## 5. Yaratıcı Güvenlik
- Undo/Redo + grup patch’ler standarttır.
- “:snapshot save/restore/list” ile git‑vari anlık görüntüler; fikirler güvenle denenir.
- “:replay” ile adımların oynatımı/hikayesi terminalden tekrar yürütülebilir.

## 6. Ölçeklenebilir Kompozisyon
- 8×8 bir ikon, 64×32 bir sprite ya da daha büyük bir sahne — tek format, tek motor.
- Yakın vadede tileset/frames desteği; export (spritesheet + JSON) akışı.

## 7. Görsel Geri Bildirim
- Tuvalde imleç, seçim ve minimap; net ve sakin animasyonlar (gerekli yerde). 
- İşlemsel onaylar terminale yazılır; gereksiz overlay yoktur.

## 8. Taşınabilir Motor
- Çekirdek motor deterministik ve dış bağımlılık minimaldir.
- vp2r linkine app/engine sürüm meta’sı eklenir. Uyuşmazlıkta kullanıcı uyarılır (görüntüleme engellenmez).

## 9. Genişletilebilir ve Birleşik Platform
- Komut sistemi, kelime‑bazlı DSL + registry ile genişletilebilir.
- Kullanıcı/eklenti komutlarına kapı aralanır (alias/makro; ileride güvenli eklenti API’sı).

## 10. Değer Odaklı Ekosistem
- Uzun vadede paylaşım galerisi, opsiyonel paketleme/çıktı servisleri, sürdürülebilirliği destekleyebilir.

## 11. Performans Olarak Çizim
- “:replay” ile çizim akışı sahne gibi izlenebilir. 
- (Opsiyonel) sadece görsel efekt üreten ‘show‑only’ modüller tuvale eklenebilir; sesi/çıkışı bozmaz.

## 12. Yaratıcının Hikayesi
- Terminal komut akışı, anlık görüntüler ve (isteğe bağlı) log export ile süreç kaydedilir.
- Hikâye, istenirse paylaşılabilir ve yeniden oynatılabilir.

## 13. Neşe ve Eğlence
- Küçük sürprizler (ör. “:palette random”, “:doodle surprise”) kontrollü ve kapatılabilir şekilde eklenir.
- Mantık: keşif → deneme → anında ödül döngüsü.

## 14. Doğrudan Temsil
- Görsel grid doğrudan gerçeği temsil eder; sonuç tahmin edilebilir.
- UI, temsilin netliğini bozmamalı (sade overlay, net kontrast).

## 15. Geniş Kapsam
- Kapsam, devasa çekirdekten değil; terminal komutları + eklentilenebilir DSL’den gelir.
- Kullanıcı topluluğunun katkılarını teşvik eden sade API yüzeyi.

## 16. Eserin “Dijital Parmak İzi”
- Link (vp2r), sürüm meta’sı ve palette slug ile eserin temsilini sabitler.
- İleride: checksum/manifest ekleri; farklı ortamda uyarı, mümkünse uyumlu açılım.

---

# İkilem Anında Yol Haritası

## 1) Çekirdek Deneyim Kırmızı Çizgidir
- Anında Tatmin, Sürtünmesiz Paylaşım, Neşe ve Eğlence, Doğrudan Temsil: ödün verilmez.
- Uygulama her zaman “aç → boya → paylaş” üçlüsünü 30–60 sn içinde mümkün kılar.

## 2) Derinlik Temeli Bozmamalı
- Gelişmiş özellikler (frames/layers/tileset) terminal komutlarıyla, isteğe bağlı açılır.
- Varsayılan arayüz sade kalır; terminal keşfedilebilirliği destekler.

## 3) Nihai Hakem: Persona’lar
- Meraklı Kaşif (ilk kez deneyen)
- Yaratıcı Kaçamak Arayan (hızlı, eğlenceli üretim)
- Sistem Mimarı (gelişmiş akışları kuran)
- Dijital Zanaatkâr (ince işçilik ve kalite)

Kararlarda, bir persona’ya fayda diğerine verdiği zarardan ağır basmalıdır. Temel deneyimi zedeleyen hiçbir özellik kabul edilmez.

---

# Uygulama Notları (Bugünkü Durum)

- Klavye akışı: NORMAL/INSERT/VISUAL (Vim benzeri); terminal “:” ile açılır.
- Paylaşım: vp2r link; palette slug; decode sırasında gerekirse LoSpec fetch.
- Komut Sistemi: kelime‑bazlı DSL (registerS), tür doğrulayıcıları (int, size, slug, oneof, url, json, rest), autocomplete + help.
- Terminal: komut/çıktı aynı panelde; “exit” ile kapanır; “clear” ile temizlenir.
- Render: CanvasGrid (kirli‑rect), MiniMap (tam çizim); tablo biçimi status paneli.

# Yakın Yol Haritası (Öneri)
- :tutorial 60s, :snapshot save/restore/list, :replay
- vp2r meta: app/engine sürüm kimliği
- “copy png(+link)” ve link paste‑to‑open
- slug autocomplete’e lospec araması fallback’i

