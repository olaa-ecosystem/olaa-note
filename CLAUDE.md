# CLAUDE.md — olaa-takenote

Repository của **Olaa TakeNote**, nhánh 03 trong hệ sinh thái Olaa (4 repository, ADR-0001).

## Nguồn kiến trúc

Kiến trúc, quyết định và trạng thái nằm ở repository `olaa-platform`, không nằm ở đây:

- [`OLAA_MASTER_ARCHITECTURE.md`](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/OLAA_MASTER_ARCHITECTURE.md)
- [Nhánh 03](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/03-olaa-takenote/README.md) và đặc tả module
- [`MODULE_REGISTRY.md`](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/MODULE_REGISTRY.md), [`DEPENDENCY_MAP.md`](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/DEPENDENCY_MAP.md), [`IMPLEMENTATION_STATUS.md`](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/IMPLEMENTATION_STATUS.md)
- [ADR](https://github.com/olaa-ecosystem/olaa-platform/blob/main/architecture/DECISIONS/README.md)

Đọc các file trên và `docs/engineering/AI_AGENT_RULES.md` trước khi làm việc.

## Quy tắc

- Chỉ làm phạm vi nhánh 03. Không import mã nội bộ của app khác; không truy cập database trực tiếp.
- Auth, design system, API client và các năng lực dùng chung lấy từ package Shared Core (nhánh 04) trong `olaa-platform`, không tự xây lại.
- Contract API và event lấy từ `olaa-platform/contracts/` (nhánh 20). Thiếu contract: đề xuất interface tối thiểu trong `olaa-platform`, không tự định nghĩa ở đây.
- Thay đổi ảnh hưởng nhánh khác: ghi `INTEGRATION_CHANGELOG.md` trong `olaa-platform`.
- Không đánh dấu module là IMPLEMENTED hay TESTED khi chưa có mã chạy được và chưa thực sự chạy kiểm tra.
- Làm trên branch `<loại>/<slug>`, Conventional Commits. Không push, force push, đổi remote hay commit secret khi chưa được yêu cầu.

## Trạng thái

Giai đoạn nền tảng: chưa có mã nguồn, chưa chốt tech stack (`docs/architecture/TECH_STACK.md`). Chưa có lệnh build hay test.
