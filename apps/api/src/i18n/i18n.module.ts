import { Module } from "@nestjs/common";
import { LocalesController } from "./locales/locales.controller";
import { LocalesService } from "./locales/locales.service";

@Module({
  controllers: [LocalesController],
  providers: [LocalesService],
  exports: [LocalesService],
})
export class I18nModule {}
