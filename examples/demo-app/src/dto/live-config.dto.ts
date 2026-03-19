import { Transform } from 'class-transformer';
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
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  public value!: string;
}

export class UpdateThemeValueDto {
  @IsString()
  @IsIn(['light', 'dark'])
  public value!: 'light' | 'dark';
}

export class LiveConfigReadQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public forceRefresh?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public preferPubSub?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseOptionalNumber(value))
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  public staleTtlMs?: number;

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
