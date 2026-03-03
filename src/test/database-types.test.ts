import { describe, it, expect } from 'vitest';
import type {
  AppRole,
  LeadClassification,
  LeadStatus,
  AppointmentStatus,
  RuleCondition,
  Lead,
  Profile,
  Appointment,
} from '@/types/database';

describe('Database Types', () => {
  it('should validate AppRole values', () => {
    const validRoles: AppRole[] = ['admin', 'lider', 'sdr', 'closer'];
    expect(validRoles).toHaveLength(4);
    validRoles.forEach(role => {
      expect(typeof role).toBe('string');
    });
  });

  it('should validate LeadClassification values', () => {
    const classifications: LeadClassification[] = ['diamante', 'ouro', 'prata', 'bronze'];
    expect(classifications).toHaveLength(4);
  });

  it('should validate LeadStatus values', () => {
    const statuses: LeadStatus[] = ['novo', 'em_atendimento', 'agendado', 'concluido'];
    expect(statuses).toHaveLength(4);
  });

  it('should validate AppointmentStatus values', () => {
    const statuses: AppointmentStatus[] = ['agendado', 'reagendado', 'realizado', 'nao_compareceu'];
    expect(statuses).toHaveLength(4);
  });

  it('should validate RuleCondition structure', () => {
    const condition: RuleCondition = {
      field: 'revenue',
      operator: 'greater_than',
      value: '50000',
      logic: 'AND',
    };

    expect(condition.field).toBe('revenue');
    expect(condition.operator).toBe('greater_than');
    expect(condition.value).toBe('50000');
    expect(condition.logic).toBe('AND');
  });

  it('should validate Lead has required fields', () => {
    const lead: Partial<Lead> = {
      id: '123',
      full_name: 'Test Lead',
      status: 'novo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(lead.id).toBeDefined();
    expect(lead.full_name).toBeDefined();
    expect(lead.status).toBe('novo');
  });

  it('should validate Profile structure', () => {
    const profile: Partial<Profile> = {
      id: '123',
      user_id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      timezone: 'America/Sao_Paulo',
      active: true,
    };

    expect(profile.name).toBe('John Doe');
    expect(profile.timezone).toBe('America/Sao_Paulo');
    expect(profile.active).toBe(true);
  });

  it('should validate Appointment structure', () => {
    const appointment: Partial<Appointment> = {
      id: '123',
      lead_id: 'lead-123',
      sdr_id: 'sdr-123',
      closer_id: 'closer-123',
      scheduled_date: '2024-03-01T10:00:00Z',
      duration: 90,
      status: 'agendado',
    };

    expect(appointment.duration).toBe(90);
    expect(appointment.status).toBe('agendado');
  });
});
