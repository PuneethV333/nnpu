import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * Infra-facing routes. Deliberately carries NO auth guards.
 *
 * Authentication in this API is opt-in per route (`@UseGuards(JwtAuthGuard)`);
 * there is no global `JwtAuthGuard`, so everything here is already reachable
 * without a token. That is required, not accidental: load balancers and uptime
 * monitors (Render's health check) call this with no Authorization header.
 * Do NOT add a guard to this controller — it would break every deploy.
 */
@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Unauthenticated. Returns a static string.',
  })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Liveness only — deliberately does NOT check Postgres or Redis.
   *
   * A load-balancer health check that returns 503 when a dependency is down
   * makes the platform kill and restart an otherwise-working process, which
   * turns a brief dependency blip into an outage. Dependency state belongs in
   * monitoring/logs, not in the check that decides whether to route traffic.
   *
   * `@SkipThrottle()` keeps probes off the global 100 req/min budget — that
   * budget is shared with real API traffic, and a probe burst must never be
   * able to get the API itself rate-limited into returning 429.
   */
  @Get('health')
  @SkipThrottle()
  @ApiExcludeEndpoint()
  health(): { status: 'ok'; uptimeSeconds: number } {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
