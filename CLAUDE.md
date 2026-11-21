# CLAUDE.md — olaa-takenote

Hướng dẫn cho Claude Code khi làm việc trong repository này.

## Repository này là gì

Olaa TakeNote: gõ và viết tay trên cùng một trang, ưu tiên iPad — nhánh 03 trong kiến trúc 22 nhánh của Olaa. Kiến trúc, PRD, contract và hạ tầng dùng chung nằm ở repository `olaa-ecosystem/olaa-platform` (ADR-0001). Stack: React 18, Vite 5, TypeScript strict, pnpm 9, Vitest (ADR-0003).

Giao diện đã được gỡ ngày 2026-11-21 để chủ dự án import bộ giao diện mới. Repository hiện chỉ có phần logic, dữ liệu và test. Xem `README.md`.

## Đọc trước khi làm

1. `README.md` của repository này.
2. Trong `olaa-platform`: `architecture/03-olaa-takenote/README.md`, `architecture/03-olaa-takenote/requirements/PRD.md`, `architecture/PRD/OLAA_Ecosystem_PRD_v1.0.md`.
3. Khi làm giao diện: `architecture/PRD/UIUX_PRD_v0.1.md`, `architecture/PRD/UI_BUTTONS_PRD_v0.1.md`, và `packages/design-system/` (biểu tượng, biểu tượng app). Ba tài liệu này đang ở branch `claude/awesome-knuth-s6a8fz` của `olaa-platform` cho tới khi được merge.
4. `architecture/IMPLEMENTATION_STATUS.md` — trạng thái thật, không giả định việc cũ đã xong.

## Quy tắc

- **Ranh giới dữ liệu.** Dữ liệu chỉ lưu trên máy (IndexedDB, `src/services/db.ts`); chưa có đăng nhập và đồng bộ. Thêm đồng bộ cần vùng Firestore và luật mới trong `olaa-platform/infrastructure/firebase/` trước.
- **Giao tiếp giữa app** chỉ qua contract trong `olaa-platform/contracts/`. TakeNote hiện chưa phát hay nhận event nào. Đổi shape event hoặc dữ liệu đồng bộ là thay đổi contract: cập nhật `olaa-platform` trước (contract, `INTEGRATION_CHANGELOG.md`), rồi mới sửa ở đây.
- **Logic thuần, có test.** Trạng thái đổi qua hàm thuần trong `src/stores/`; mỗi hàm mới có test Vitest cạnh file.
- **Đổi shape dữ liệu đã lưu** phải tăng phiên bản và có hàm chuyển đổi dữ liệu cũ kèm test. Không làm mất dữ liệu người dùng khi chưa được chủ dự án đồng ý.
- **Song ngữ.** Mọi chữ hiển thị đi qua `tr(vi, en)` trong `src/i18n/`.
- **Không tạo đồ giả.** Không thêm file, thư mục hay module rỗng chỉ để đánh dấu tiến độ.
- **Trạng thái trung thực.** Chỉ báo "đã kiểm tra" khi đã thật sự chạy lệnh.
- **Bảo mật.** Không commit khoá, token, file `.env`; cấu hình Firebase web chỉ nằm trong `.env.*` theo `.env.example`. Khoá service account chỉ nằm trong GitHub secret.

## Lệnh

```bash
pnpm install
pnpm test        # Vitest
pnpm typecheck
pnpm lint
pnpm build
pnpm run audit   # lỗ hổng mức high trở lên trong dependency
```

Chạy đủ test, typecheck, lint, build trước khi commit. CI (`.github/workflows/ci.yml`) chạy cùng các lệnh này.

## Git

- Kiểm tra `git status` và branch hiện tại trước khi sửa.
- Làm trên branch `<loại>/<slug>` (`feat`, `fix`, `docs`, `chore`, `refactor`), không commit thẳng vào `main`. Commit theo Conventional Commits.
- Không force push, không xoá lịch sử, không đổi remote.
- Chỉ push hoặc mở PR khi chủ dự án yêu cầu.

## Không được làm khi chưa có xác nhận

Xoá chức năng hoặc dữ liệu, đổi schema theo cách phá tương thích, đổi event hay API đang dùng, thay công nghệ hiện có, nâng phiên bản lớn của dependency.
