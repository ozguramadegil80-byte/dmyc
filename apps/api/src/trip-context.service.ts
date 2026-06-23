import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

const SILENCE_FULL = 10;
const SILENCE_PARTIAL = 3;
const DEVIATION_THRESHOLD = 0.2;

type QuestionType = 'CLIMATE_USAGE' | 'PASSENGER_COUNT' | 'CARGO_PRESENCE' | 'DEVIATION_REASON';

const CONTEXT_FIELD_MAP: Record<string, string> = {
  CLIMATE_USAGE: 'climate_usage',
  PASSENGER_COUNT: 'passenger_count',
  CARGO_PRESENCE: 'cargo_presence',
  DEVIATION_REASON: 'deviation_reason',
};

@Injectable()
export class TripContextService {
  constructor(private readonly db: DatabaseService) {}

  async generateQuestionsForTrip(tripId: string): Promise<{
    questions: Array<{ id: string; questionType: QuestionType }>;
    hasPendingQuestions: boolean;
  }> {
    const tripRes = await this.db.query(
      `
        SELECT
          t.vehicle_id,
          tra.deviation_distance_ratio,
          rf.observed_trip_count
        FROM trips t
        LEFT JOIN trip_route_assignments tra ON tra.trip_id = t.id
        LEFT JOIN route_fingerprints rf      ON rf.id = tra.route_fingerprint_id
        WHERE t.id = $1
      `,
      [tripId],
    );

    if (!tripRes.rows[0]) return { questions: [], hasPendingQuestions: false };

    const { vehicle_id, deviation_distance_ratio, observed_trip_count } = tripRes.rows[0];
    const observedCount = Number(observed_trip_count ?? 0);
    const deviationRatio = Number(deviation_distance_ratio ?? 0);
    const hasDeviation = deviationRatio > DEVIATION_THRESHOLD;

    let questionsToAsk: QuestionType[] = [];

    if (observedCount < SILENCE_PARTIAL) {
      questionsToAsk = ['CLIMATE_USAGE', 'PASSENGER_COUNT', 'CARGO_PRESENCE'];
    } else if (observedCount < SILENCE_FULL) {
      if (hasDeviation) questionsToAsk = ['DEVIATION_REASON'];
    } else {
      if (hasDeviation) questionsToAsk = ['DEVIATION_REASON'];
    }

    if (questionsToAsk.length === 0) {
      return { questions: [], hasPendingQuestions: false };
    }

    const inserted: Array<{ id: string; questionType: QuestionType }> = [];
    for (const questionType of questionsToAsk) {
      const res = await this.db.query(
        `
          INSERT INTO trip_context_questions (trip_id, vehicle_id, question_type)
          VALUES ($1, $2, $3)
          ON CONFLICT (trip_id, question_type) DO NOTHING
          RETURNING id, question_type AS "questionType"
        `,
        [tripId, vehicle_id, questionType],
      );
      if (res.rows[0]) inserted.push(res.rows[0] as { id: string; questionType: QuestionType });
    }

    return {
      questions: inserted,
      hasPendingQuestions: inserted.length > 0,
    };
  }

  async getQuestionsForTrip(tripId: string) {
    const res = await this.db.query(
      `
        SELECT
          id,
          trip_id        AS "tripId",
          vehicle_id     AS "vehicleId",
          question_type  AS "questionType",
          is_silenced    AS "isSilenced",
          answered_at    AS "answeredAt",
          created_at     AS "createdAt"
        FROM trip_context_questions
        WHERE trip_id = $1
          AND answered_at IS NULL
          AND is_silenced = false
        ORDER BY created_at ASC
      `,
      [tripId],
    );
    return res.rows;
  }

  async recordAnswer(tripId: string, body: { questionType: string; answer: string }) {
    const tripRes = await this.db.query(
      `SELECT vehicle_id FROM trips WHERE id = $1`,
      [tripId],
    );
    if (!tripRes.rows[0]) return null;
    const vehicleId = tripRes.rows[0].vehicle_id as string;

    await this.db.query(
      `
        INSERT INTO trip_behavior_signals (trip_id, vehicle_id, signal_type, signal_value)
        VALUES ($1, $2, $3, $4)
      `,
      [tripId, vehicleId, body.questionType, body.answer],
    );

    await this.db.query(
      `
        UPDATE trip_context_questions
        SET answered_at = now()
        WHERE trip_id = $1 AND question_type = $2
      `,
      [tripId, body.questionType],
    );

    const contextField = CONTEXT_FIELD_MAP[body.questionType];
    if (contextField) {
      await this.db.query(
        `
          INSERT INTO trip_contexts (trip_id, vehicle_id, ${contextField})
          VALUES ($1, $2, $3)
          ON CONFLICT (trip_id)
          DO UPDATE SET ${contextField} = EXCLUDED.${contextField}, updated_at = now()
        `,
        [tripId, vehicleId, body.answer],
      );
    }

    return { ok: true, tripId, questionType: body.questionType, answer: body.answer };
  }

  async getContextForTrip(tripId: string) {
    const res = await this.db.query(
      `
        SELECT
          id,
          trip_id          AS "tripId",
          vehicle_id       AS "vehicleId",
          climate_usage    AS "climateUsage",
          passenger_count  AS "passengerCount",
          cargo_presence   AS "cargoPresence",
          deviation_reason AS "deviationReason",
          source,
          created_at       AS "createdAt",
          updated_at       AS "updatedAt"
        FROM trip_contexts
        WHERE trip_id = $1
        LIMIT 1
      `,
      [tripId],
    );
    return res.rows[0] ?? null;
  }
}
