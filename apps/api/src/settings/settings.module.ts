import { Module } from "@nestjs/common";
import { FeaturesController } from "./features/features.controller";
import { FeaturesService } from "./features/features.service";
import { PermissionsController } from "./permissions/permissions.controller";
import { PermissionsService } from "./permissions/permissions.service";
import { AppSettingsController } from "./app-settings/app-settings.controller";
import { AppSettingsService } from "./app-settings/app-settings.service";

@Module({
  controllers: [FeaturesController, PermissionsController, AppSettingsController],
  providers: [FeaturesService, PermissionsService, AppSettingsService],
  exports: [FeaturesService],
})
export class SettingsModule {}
