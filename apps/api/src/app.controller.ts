import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "./common/decorators";

@ApiTags("Health")
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Health check" })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get("health")
  @ApiOperation({ summary: "Detailed health check" })
  getDetailedHealth() {
    return this.appService.getDetailedHealth();
  }
}
