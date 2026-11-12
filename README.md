# Balatro Advisor

Cố vấn cho Balatro trên Android: chỉ nước đánh/bỏ lá, thứ tự joker, món nên mua trong shop, có nên skip blind. App chỉ gợi ý, người chơi tự thao tác.

## Thành phần
- `src/engine.js` — bộ não: nhận diện tay, tính điểm đúng trình tự của game (bản 1.0.1), Monte Carlo cho quyết định bỏ bài, thử mọi thứ tự joker, mô phỏng giá trị món trong shop.
- `src/ui.html` — giao diện (chạy trên web và trong app).
- `android/` — app Kotlin: bong bóng nổi, bảng gợi ý đè lên game, quét màn hình để nhận lá, vẽ khung lá nên đánh/bỏ.
- `test/engine.test.mjs` — test bộ não (`node test/engine.test.mjs`).

## Build
`node build.mjs` ghép bộ não vào trang (`dist/index.html` và `android/app/src/main/assets/index.html`).
APK được GitHub Actions build tự động khi đẩy lên nhánh `main`; tải ở mục **Releases → latest**.

## Dùng app
1. Cài APK, mở app, bấm "Cho phép hiển thị trên app khác".
2. Bấm "Bật bong bóng + quét màn hình", đồng ý quay màn hình.
3. Mở Balatro, chạm bong bóng → "Quét". Lần đầu app hỏi từng lá là gì; dạy một lần, lần sau tự nhận.
4. Bấm "Gợi ý nước đi": bảng thu lại, khung xanh = lá nên đánh, khung đỏ = lá nên bỏ.
