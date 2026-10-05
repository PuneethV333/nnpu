import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

/**
 * Body for `PATCH /announcement/:id`.
 *
 * `PartialType` makes every field optional. Changing `audience` to `Section`
 * without supplying a `sectionId` is rejected in the service, since the pair is
 * only meaningful together.
 */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
