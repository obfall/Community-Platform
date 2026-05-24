import { plainToInstance } from "class-transformer";
import { UploadFileDto } from "./upload-file.dto";

// main.ts の ValidationPipe と同じ設定。multipart/form-data も全フィールドが文字列で受信されるため、
// クエリパラメータ同様の挙動になる。
const transform = (plain: Record<string, unknown>) =>
  plainToInstance(UploadFileDto, plain, { enableImplicitConversion: true });

describe("UploadFileDto: isPublic の boolean 変換", () => {
  it('isPublic="true" は true になる', () => {
    const dto = transform({ fileCategory: "image", isPublic: "true" });
    expect(dto.isPublic).toBe(true);
  });

  // 過去バグ: enableImplicitConversion: true により Boolean("false") = true となり、
  // 文字列 "false" でも公開ファイル扱いになっていた。再発防止のため明示テスト。
  it('isPublic="false" は false になる', () => {
    const dto = transform({ fileCategory: "image", isPublic: "false" });
    expect(dto.isPublic).toBe(false);
  });

  it("isPublic 未指定なら undefined", () => {
    const dto = transform({ fileCategory: "image" });
    expect(dto.isPublic).toBeUndefined();
  });

  it("boolean プリミティブ true / false もそのまま反映される", () => {
    expect(transform({ fileCategory: "image", isPublic: true }).isPublic).toBe(true);
    expect(transform({ fileCategory: "image", isPublic: false }).isPublic).toBe(false);
  });
});
