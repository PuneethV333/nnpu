import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

/**
 * A Cloudinary delivery URL, as returned by an unsigned upload from the app.
 *
 * Deliberately NOT a free `@IsUrl()`. This value is written by any logged-in
 * user and then rendered in other people's screens — a class teacher's
 * attendance roster draws every student's `profilePic`. An arbitrary URL there
 * is an image load every viewer's device performs against a host the uploader
 * chose, which leaks IP addresses and makes the field a tracking pixel. Pinning
 * the host to Cloudinary's delivery domain keeps the column to images this
 * school's own account is serving.
 *
 * Only `res.cloudinary.com` is accepted. A private CDN distribution or a custom
 * CNAME would serve from a different host and has to be added here explicitly.
 */
const CLOUDINARY_DELIVERY_URL =
  /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/\S+$/;

/** Body for `PATCH /users/me/profile-pic`. */
export class UpdateProfilePicDto {
  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1700000000/profile-pics/abc123.jpg',
    description:
      'Cloudinary secure_url from the unsigned upload the app performed',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  // Bounded before the pattern runs: the column is unbounded text, and a
  // megabyte-long "URL" is a cheap way to bloat every row that reads it.
  @MaxLength(2048)
  @Matches(CLOUDINARY_DELIVERY_URL, {
    message: 'url must be a Cloudinary image delivery URL (res.cloudinary.com)',
  })
  url!: string;
}
