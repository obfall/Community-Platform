import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

class ProfileDto {
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiPropertyOptional() bio?: string | null;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() birthday?: Date | null;
  @ApiPropertyOptional() website?: string | null;
  @ApiPropertyOptional() nameKana?: string | null;
  @ApiPropertyOptional() gender?: string | null;
  @ApiPropertyOptional() occupation?: string | null;
  @ApiPropertyOptional() countryOfOrigin?: string | null;
  @ApiProperty() allowDirectMessages!: boolean;
  @ApiPropertyOptional() headerImageUrl?: string | null;
}

class PublicInfoDto {
  @ApiPropertyOptional() nickname?: string | null;
  @ApiPropertyOptional() nicknameKana?: string | null;
  @ApiPropertyOptional() specialty?: string | null;
  @ApiPropertyOptional() prefecture?: string | null;
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() foreignCountry?: string | null;
  @ApiPropertyOptional() foreignCity?: string | null;
  @ApiPropertyOptional() introduction?: string | null;
  @ApiPropertyOptional() eventRole?: string | null;
  @ApiProperty() publicStatus!: string;
}

class InterestDto {
  @ApiProperty() id!: string;
  @ApiProperty() categoryId!: string;
  @ApiPropertyOptional() categoryName?: string;
}

class LanguageDto {
  @ApiProperty() id!: string;
  @ApiProperty() languageCode!: string;
  @ApiPropertyOptional() proficiency?: string | null;
  @ApiProperty() sortOrder!: number;
}

class AffiliationDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationName!: string;
  @ApiPropertyOptional() title?: string | null;
  @ApiPropertyOptional() roleDescription?: string | null;
  @ApiProperty() sortOrder!: number;
}

export class UserDetailDto extends UserListItemDto {
  @ApiPropertyOptional({ type: ProfileDto })
  profile?: ProfileDto | null;

  @ApiPropertyOptional({ type: PublicInfoDto })
  publicInfo?: PublicInfoDto | null;

  @ApiProperty({ type: [InterestDto] })
  interests!: InterestDto[];

  @ApiProperty({ type: [LanguageDto] })
  languages!: LanguageDto[];

  @ApiProperty({ type: [AffiliationDto] })
  affiliations!: AffiliationDto[];
}
