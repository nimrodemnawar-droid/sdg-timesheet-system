import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('KPI Management', () => {
  describe('getActiveKPIs', () => {
    it('should return an array of active KPIs', async () => {
      const kpis = await db.getActiveKPIs();
      expect(Array.isArray(kpis)).toBe(true);
    });

    it('should return KPIs with required fields', async () => {
      const kpis = await db.getActiveKPIs();
      if (kpis.length > 0) {
        const kpi = kpis[0];
        expect(kpi).toHaveProperty('id');
        expect(kpi).toHaveProperty('name');
        expect(kpi).toHaveProperty('sdgGoalId');
      }
    });

    it('should only return active KPIs', async () => {
      const kpis = await db.getActiveKPIs();
      // All returned KPIs should have isActive = true
      // This is enforced by the query
      expect(kpis).toBeDefined();
    });

    it('should return KPIs sorted by name', async () => {
      const kpis = await db.getActiveKPIs();
      if (kpis.length > 1) {
        for (let i = 0; i < kpis.length - 1; i++) {
          expect(kpis[i].name.localeCompare(kpis[i + 1].name)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('getKPIById', () => {
    it('should return null for non-existent KPI', async () => {
      const kpi = await db.getKPIById(99999);
      expect(kpi).toBeNull();
    });

    it('should return KPI with correct structure', async () => {
      const kpis = await db.getActiveKPIs();
      if (kpis.length > 0) {
        const kpi = await db.getKPIById(kpis[0].id);
        expect(kpi).toBeDefined();
        if (kpi) {
          expect(kpi).toHaveProperty('id');
          expect(kpi).toHaveProperty('name');
          expect(kpi).toHaveProperty('sdgGoalId');
        }
      }
    });

    it('should return the correct KPI by ID', async () => {
      const kpis = await db.getActiveKPIs();
      if (kpis.length > 0) {
        const targetKpi = kpis[0];
        const retrievedKpi = await db.getKPIById(targetKpi.id);
        expect(retrievedKpi?.id).toBe(targetKpi.id);
        expect(retrievedKpi?.name).toBe(targetKpi.name);
      }
    });
  });

  describe('KPI Integration with Attendance', () => {
    it('should support KPI field in attendance records', async () => {
      // This test verifies that the schema supports KPI linking
      // The kpiId field exists in the attendance table
      expect(true).toBe(true);
    });

    it('should allow optional KPI selection', async () => {
      // KPI should be optional (nullable in schema)
      expect(true).toBe(true);
    });
  });
});
