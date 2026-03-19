import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateLiveConfigValueDto {
  @ApiProperty({
    type: String,
    description: 'New config value for the message setting.',
    minLength: 1,
    maxLength: 512,
    example: 'Hello from Swagger',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  public value!: string;
}

export class UpdateThemeValueDto {
  @ApiProperty({
    type: String,
    description: 'Theme value stored in live config.',
    enum: ['light', 'dark'],
    example: 'dark',
  })
  @IsString()
  @IsIn(['light', 'dark'])
  public value!: 'light' | 'dark';
}

export class LiveConfigReadQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Force a fresh store read instead of using cached data.',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public forceRefresh?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Prefer push-based sync when the configured adapter supports it.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public preferPubSub?: boolean;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Maximum cached age in milliseconds before a fresh read is required.',
    minimum: 0,
    maximum: 86_400_000,
    example: 5000,
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalNumber(value))
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  public staleTtlMs?: number;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Polling interval in milliseconds when using polling-based sync.',
    minimum: 100,
    maximum: 60_000,
    example: 1000,
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalNumber(value))
  @IsInt()
  @Min(100)
  @Max(60_000)
  public watchIntervalMs?: number;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value as boolean;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value);
}
