import { ApiProperty } from "@nestjs/swagger";

export class PreferenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() notificationType!: string;
  @ApiProperty() emailEnabled!: boolean;
  @ApiProperty() inAppEnabled!: boolean;
  @ApiProperty() lineEnabled!: boolean;
}
