import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller.js";

import { AuthController } from "./auth.controller.js";
import { OrganizationsController } from "./organizations.controller.js";

@Module({ controllers: [HealthController, AuthController, OrganizationsController] })
export class AppModule {}
