import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, MaxLength } from "class-validator";
import { EventOrganizationRole } from "@prisma/client";
import { MAX_ORGANIZATION_NAME_LENGTH } from "@community-platform/shared";

export class EventOrganizationItemDto {
  @ApiProperty({ description: "団体名", maxLength: MAX_ORGANIZATION_NAME_LENGTH })
  @IsString()
  @MaxLength(MAX_ORGANIZATION_NAME_LENGTH)
  organizationName!: string;

  @ApiProperty({ enum: EventOrganizationRole, description: "役割" })
  @IsEnum(EventOrganizationRole)
  role!: EventOrganizationRole;
}
