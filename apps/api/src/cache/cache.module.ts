import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";

/**
 * グローバル Cache モジュール。
 *
 * @Global() を付けることで、各 feature モジュールで imports に書かなくても
 * CacheService を inject できる。Cache は横断的関心事のため Global 採用。
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
