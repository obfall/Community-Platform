import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, MaxLength } from "class-validator";
import { EventOrganizationRole } from "@prisma/client";

export class EventOrganizationItemDto {
  @ApiProperty({ description: "団体名", maxLength: 200 })
  @IsString()
  @MaxLength(200)
  organizationName!: string;

  @ApiProperty({ enum: EventOrganizationRole, description: "役割" })
  @IsEnum(EventOrganizationRole)
  role!: EventOrganizationRole;
}
