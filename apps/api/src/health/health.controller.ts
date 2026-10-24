import { Controller, Get } from "@nestjs/common";
import { healthPayload, infoPayload } from "./health.contract.mjs";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return healthPayload();
  }

  @Get("info")
  info() {
    return infoPayload();
  }
}
