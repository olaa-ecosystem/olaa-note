# Olaa TakeNote

Gõ và viết tay trên cùng một trang, ưu tiên iPad. PRD: `olaa-platform/architecture/03-olaa-takenote/requirements/PRD.md`. Dữ liệu lưu trên máy bằng IndexedDB; chưa có đăng nhập và đồng bộ.

## Trạng thái giao diện

**Giao diện (frontend) đã được gỡ khỏi repository ngày 2026-11-21** theo yêu cầu của chủ dự án, để import bộ giao diện mới sau. Repository hiện chỉ giữ phần logic và dữ liệu, có test. `index.html` có sẵn `<div id="root">`; `src/main.ts` chỉ khởi chạy các dịch vụ dữ liệu. Giao diện mới gắn vào `#root` và dùng các module bên dưới.

Yêu cầu giao diện: `olaa-platform/architecture/PRD/UIUX_PRD_v0.1.md` và `UI_BUTTONS_PRD_v0.1.md`.

## Phần logic còn lại

```
src/
  features/
    notebook-management/     Sổ tay, trang, đính kèm tệp, chuyển trang giữa các sổ
    page-management/         Loại giấy, kích thước trang
    digital-canvas/          Các mục trên trang (nét vẽ, chữ, ảnh, tệp)
    inking-tools/            Đường nét bút
    rich-text-editor/        Lọc HTML an toàn, định dạng chữ, chuyển chữ thành khối để xuất
    document-annotation/     Nhập PDF thành trang
    export-sharing/          Vẽ trang ra canvas, xuất PDF, chia sẻ hoặc tải về
    history-recovery/        Hoàn tác/làm lại, khôi phục chữ chưa lưu
    search/                  Tìm theo tên, chữ gõ, tên tệp, thẻ
  stores/                    Trạng thái sổ tay (hàm thuần) và store
  services/db.ts             IndexedDB
  i18n/                      Song ngữ Việt/Anh: tr(vi, en)
```

## Phát triển

Cần Node 20+ và pnpm 9.

```bash
pnpm install
pnpm test         # test phần logic
pnpm lint
pnpm typecheck
pnpm build        # dist/ (chưa có giao diện)
```

Deploy: Firebase Hosting site `olaa-takenote` (project `olaa-ecosystem`), GitHub Actions deploy bản xem trước cho PR và bản chính khi merge `main` (`.github/workflows/deploy.yml`). Luật Firestore nằm ở `olaa-platform/infrastructure/firebase/`.

## Bảo mật

Xem `SECURITY.md`.
