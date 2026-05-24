import { plainToInstance } from "class-transformer";
import { NotificationQueryDto } from "./notification-query.dto";

// main.ts の ValidationPipe と同じ設定。クエリ文字列は plain object（全 string）として受信されるため、
// その挙動を再現する。
const transform = (plain: Record<string, unknown>) =>
  plainToInstance(NotificationQueryDto, plain, { enableImplicitConversion: true });

describe("NotificationQueryDto: unreadOnly の boolean 変換", () => {
  it('unreadOnly="true"（クエリ文字列）は true になる', () => {
    const dto = transform({ unreadOnly: "true" });
    expect(dto.unreadOnly).toBe(true);
  });

  // 過去バグ: enableImplicitConversion: true により Boolean("false") = true となり、
  // クエリ文字列 "false" でも未読フィルタが効いてしまっていた。再発防止のため明示テスト。
  it('unreadOnly="false"（クエリ文字列）は false になる', () => {
    const dto = transform({ unreadOnly: "false" });
    expect(dto.unreadOnly).toBe(false);
  });

  it("unreadOnly が未指定なら undefined", () => {
    const dto = transform({});
    expect(dto.unreadOnly).toBeUndefined();
  });

  it('"true" / true 以外の値（"0", "1", "yes" など）はすべて false', () => {
    expect(transform({ unreadOnly: "0" }).unreadOnly).toBe(false);
    expect(transform({ unreadOnly: "1" }).unreadOnly).toBe(false);
    expect(transform({ unreadOnly: "yes" }).unreadOnly).toBe(false);
  });

  it("boolean プリミティブ true / false もそのまま反映される", () => {
    expect(transform({ unreadOnly: true }).unreadOnly).toBe(true);
    expect(transform({ unreadOnly: false }).unreadOnly).toBe(false);
  });
});
