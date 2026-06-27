import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export type SponsorConfig = {
  id: string;
  logoUrl: string | null;
  clickUrl: string | null;
  label: string | null;
  isActive: boolean;
  updatedAt: string;
};

@Injectable()
export class SponsorService {
  constructor(private readonly db: DatabaseService) {}

  async get(): Promise<SponsorConfig | null> {
    const result = await this.db.query(
      `SELECT id, logo_url AS "logoUrl", click_url AS "clickUrl", label, is_active AS "isActive", updated_at AS "updatedAt"
       FROM sponsor_config LIMIT 1`,
    );
    return (result.rows[0] as SponsorConfig) ?? null;
  }

  async update(body: { logoUrl?: string | null; clickUrl?: string | null; label?: string | null; isActive?: boolean }): Promise<SponsorConfig> {
    const result = await this.db.query(
      `UPDATE sponsor_config
       SET
         logo_url   = COALESCE($1, logo_url),
         click_url  = COALESCE($2, click_url),
         label      = COALESCE($3, label),
         is_active  = COALESCE($4, is_active),
         updated_at = now()
       WHERE id = (SELECT id FROM sponsor_config LIMIT 1)
       RETURNING id, logo_url AS "logoUrl", click_url AS "clickUrl", label, is_active AS "isActive", updated_at AS "updatedAt"`,
      [body.logoUrl ?? null, body.clickUrl ?? null, body.label ?? null, body.isActive ?? null],
    );
    return result.rows[0] as SponsorConfig;
  }
}
