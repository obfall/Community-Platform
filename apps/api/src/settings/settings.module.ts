import { Module } from "@nestjs/common";
import { FeaturesController } from "./features/features.controller";
import { FeaturesService } from "./features/features.service";
import { PermissionsController } from "./permissions/permissions.controller";
import { PermissionsService } from "./permissions/permissions.service";
import { AppSettingsController } from "./app-settings/app-settings.controller";
import { AppSettingsService } from "./app-settings/app-settings.service";
import { OptionsController } from "./options/options.controller";
import { OptionsService } from "./options/options.service";

@Module({
  controllers: [
    FeaturesController,
    PermissionsController,
    AppSettingsController,
    OptionsController,
  ],
  providers: [FeaturesService, PermissionsService, AppSettingsService, OptionsService],
  exports: [FeaturesService],
})
export class SettingsModule {}
