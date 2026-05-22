import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug: string;

  @IsOptional()
  branding?: Record<string, unknown>;
}
