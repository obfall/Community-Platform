import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateProfileDto } from "./update-profile.dto";

const validateDto = (plain: Record<string, unknown>) =>
  validate(plainToInstance(UpdateProfileDto, plain));

const errorsFor = async (plain: Record<string, unknown>, property: string) => {
  const errors = await validateDto(plain);
  return errors.find((e) => e.property === property);
};

describe("UpdateProfileDto: nameKana のカナバリデーション", () => {
  it("全角カタカナは通る", async () => {
    expect(await errorsFor({ nameKana: "ヤマダ タロウ" }, "nameKana")).toBeUndefined();
  });

  it("空文字は通る（任意項目のため）", async () => {
    expect(await errorsFor({ nameKana: "" }, "nameKana")).toBeUndefined();
  });

  it("未指定は通る", async () => {
    expect(await errorsFor({}, "nameKana")).toBeUndefined();
  });

  it("漢字は matches エラーになる", async () => {
    const error = await errorsFor({ nameKana: "山田太郎" }, "nameKana");
    expect(error?.constraints).toHaveProperty("matches");
  });

  it("英数字は matches エラーになる", async () => {
    const error = await errorsFor({ nameKana: "yamada" }, "nameKana");
    expect(error?.constraints).toHaveProperty("matches");
  });
});
