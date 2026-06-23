import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdatePublicInfoDto } from "./update-public-info.dto";

const validateDto = (plain: Record<string, unknown>) =>
  validate(plainToInstance(UpdatePublicInfoDto, plain));

const errorsFor = async (plain: Record<string, unknown>, property: string) => {
  const errors = await validateDto(plain);
  return errors.find((e) => e.property === property);
};

describe("UpdatePublicInfoDto: nicknameKana のカナバリデーション", () => {
  it("全角カタカナは通る", async () => {
    expect(await errorsFor({ nicknameKana: "タロウ" }, "nicknameKana")).toBeUndefined();
  });

  it("長音符・全角スペースを含む全角カタカナは通る", async () => {
    expect(await errorsFor({ nicknameKana: "アン　マリー" }, "nicknameKana")).toBeUndefined();
  });

  it("空文字は通る（任意項目のため）", async () => {
    expect(await errorsFor({ nicknameKana: "" }, "nicknameKana")).toBeUndefined();
  });

  it("未指定は通る", async () => {
    expect(await errorsFor({}, "nicknameKana")).toBeUndefined();
  });

  it("ひらがなは matches エラーになる", async () => {
    const error = await errorsFor({ nicknameKana: "たろう" }, "nicknameKana");
    expect(error?.constraints).toHaveProperty("matches");
  });

  it("英数字は matches エラーになる", async () => {
    const error = await errorsFor({ nicknameKana: "taro" }, "nicknameKana");
    expect(error?.constraints).toHaveProperty("matches");
  });
});
