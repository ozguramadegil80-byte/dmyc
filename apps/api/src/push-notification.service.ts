import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushNotificationService {
  constructor(private readonly db: DatabaseService) {}

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET expo_push_token = $2, push_token_updated_at = now() WHERE id = $1`,
      [userId, token],
    );
  }

  async sendBehaviorAlert(
    userId: string,
    payload: { ecoScore: number; hardBrakeCount: number; rapidAccelCount: number },
  ): Promise<void> {
    const result = await this.db.query<{ expoPushToken: string | null }>(
      `SELECT expo_push_token AS "expoPushToken" FROM users WHERE id = $1`,
      [userId],
    );
    const token = result.rows[0]?.expoPushToken;
    if (!token?.startsWith('ExponentPushToken')) return;

    const { ecoScore, hardBrakeCount, rapidAccelCount } = payload;

    let body = `Sürüş skoru: ${Math.round(ecoScore)}/100`;
    if (hardBrakeCount > 0 && rapidAccelCount > 0) {
      body = `${hardBrakeCount} sert fren, ${rapidAccelCount} ani hızlanma. Skor: ${Math.round(ecoScore)}/100`;
    } else if (hardBrakeCount > 0) {
      body = `${hardBrakeCount} sert fren tespit edildi. Skor: ${Math.round(ecoScore)}/100`;
    } else if (rapidAccelCount > 0) {
      body = `${rapidAccelCount} ani hızlanma tespit edildi. Skor: ${Math.round(ecoScore)}/100`;
    }

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title: 'Sürücü Karnen Güncellendi',
        body,
        data: { type: 'behavior_alert' },
        sound: 'default',
      }),
    }).catch(() => { /* push hatası sessizce yutulur */ });
  }
}
