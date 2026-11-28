import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { ScheduleOverride } from '../entities/schedule-override.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { AttendanceLog } from '../entities/attendance-log.entity';
import { AttendancePolicy } from '../entities/attendance-policy.entity';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('SchedulesService', () => {
    let service: SchedulesService;
    let repo: ReturnType<typeof createMockRepository>;
    let overrideRepo: ReturnType<typeof createMockRepository>;
    let leaveRepo: ReturnType<typeof createMockRepository>;
    let attendanceRepo: ReturnType<typeof createMockRepository>;
    let policyRepo: ReturnType<typeof createMockRepository>;
    let employees: { findByIdOrFail: jest.Mock; findAll?: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<WorkSchedule>();
        overrideRepo = createMockRepository<ScheduleOverride>();
        leaveRepo = createMockRepository<LeaveRequest>();
        attendanceRepo = createMockRepository<AttendanceLog>();
        policyRepo = createMockRepository<AttendancePolicy>();
        employees = { findByIdOrFail: jest.fn().mockResolvedValue({ id: 'e1' }) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                SchedulesService,
                { provide: getRepositoryToken(WorkSchedule), useValue: repo },
                { provide: getRepositoryToken(ScheduleOverride), useValue: overrideRepo },
                { provide: getRepositoryToken(LeaveRequest), useValue: leaveRepo },
                { provide: getRepositoryToken(AttendanceLog), useValue: attendanceRepo },
                { provide: getRepositoryToken(AttendancePolicy), useValue: policyRepo },
                { provide: EmployeesService, useValue: employees },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(SchedulesService);
    });

    it('rejects schedule when startTime >= endTime', async () => {
        await expect(
            service.create({
                employeeId: 'e1',
                dayOfWeek: 1,
                startTime: '17:00',
                endTime: '08:00',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('checks overlaps excluding current schedule on update', async () => {
        repo.findOne.mockResolvedValue({
            id: 's1',
            employeeId: 'e1',
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
            isActive: true,
        } as never);

        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(true),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        await expect(
            service.update('e1', 's1', { endTime: '15:00' }),
        ).rejects.toThrow(BadRequestException);

        expect(qb.andWhere).toHaveBeenCalledWith('s.id != :excludeId', { excludeId: 's1' });
    });

    it('enforces employeeId ownership on remove', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(service.remove('e1', 's-of-e2')).rejects.toThrow(NotFoundException);
    });

    it('returns unavailable when date has day-off ScheduleOverride', async () => {
        overrideRepo.findOne.mockResolvedValue({
            id: 'ov1',
            employeeId: 'e1',
            date: '2026-12-25',
            isAvailable: false,
            reason: 'Public Holiday',
        } as never);

        const res = await service.isEmployeeAvailableOnDate('e1', '2026-12-25', '10:00');
        expect(res).toEqual({ available: false, reason: 'Public Holiday' });
    });

    it('rejects double clock-in when an open attendance log exists', async () => {
        attendanceRepo.findOne.mockResolvedValue({ id: 'a1', employeeId: 'e1', clockOutAt: null } as never);
        await expect(service.clockIn('e1')).rejects.toThrow(ConflictException);
    });

    it('records clock-in and clock-out cleanly', async () => {
        attendanceRepo.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'a1', employeeId: 'e1', clockInAt: new Date(), clockOutAt: null } as never);
        attendanceRepo.create.mockImplementation((d) => d);
        attendanceRepo.save.mockImplementation(async (d) => ({ id: 'a1', ...d }));

        const inLog = await service.clockIn('e1', 'Morning shift', 'WEB');
        expect(inLog.employeeId).toBe('e1');
        expect(inLog.clockOutAt).toBeNull();
        expect(['ON_TIME', 'LATE']).toContain(inLog.status);

        const outLog = await service.clockOut('e1', 'Done');
        expect(outLog.clockOutAt).toBeInstanceOf(Date);
        expect(typeof outLog.workedMinutes).toBe('number');
    });

    it('returns unavailable when employee is on approved leave', async () => {
        overrideRepo.findOne.mockResolvedValue(null);
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ id: 'lr1', leaveType: 'ANNUAL' }),
        };
        leaveRepo.createQueryBuilder.mockReturnValue(qb as never);

        const res = await service.isEmployeeAvailableOnDate('e1', '2026-12-26', '10:00');
        expect(res).toEqual({ available: false, reason: 'On approved ANNUAL leave' });
    });

    it('creates a 2-session split-shift attendance policy sorted chronologically and rejects overlapping sessions', async () => {
        policyRepo.find.mockResolvedValue([]);
        policyRepo.create.mockImplementation((d) => d);
        policyRepo.save.mockImplementation(async (d) => ({ id: 'pol1', ...d }));

        const created = await service.createAttendancePolicy({
            name: 'Split Shift 2x',
            isDefault: true,
            graceMinutes: 10,
            sessions: [
                { label: 'Afternoon', checkInTime: '13:00', checkOutTime: '17:00' },
                { label: 'Morning', checkInTime: '08:00', checkOutTime: '11:00' },
            ],
        });

        expect(created.sessions[0].label).toBe('Morning');
        expect(created.sessions[1].label).toBe('Afternoon');

        await expect(
            service.createAttendancePolicy({
                name: 'Bad Overlap',
                sessions: [
                    { label: 'S1', checkInTime: '08:00', checkOutTime: '12:00' },
                    { label: 'S2', checkInTime: '11:30', checkOutTime: '15:00' },
                ],
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('tracks sessionIndex against active multi-session policy and blocks extra check-ins beyond max sessions', async () => {
        policyRepo.findOne.mockResolvedValue({
            id: 'pol-split',
            name: '2x Shift',
            isDefault: true,
            isActive: true,
            graceMinutes: 10,
            sessions: [
                { label: 'Morning', checkInTime: '08:00', checkOutTime: '11:00' },
                { label: 'Afternoon', checkInTime: '13:00', checkOutTime: '17:00' },
            ],
        } as never);
        attendanceRepo.findOne.mockResolvedValue(null);
        attendanceRepo.create.mockImplementation((d) => d);
        attendanceRepo.save.mockImplementation(async (d) => ({ id: 'log1', ...d }));

        attendanceRepo.count.mockResolvedValueOnce(0);
        const first = await service.clockIn('e1', 'Morning in', 'WEB');
        expect(first.sessionIndex).toBe(0);
        expect(first.policyId).toBe('pol-split');

        attendanceRepo.count.mockResolvedValueOnce(1);
        const second = await service.clockIn('e1', 'Afternoon in', 'WEB');
        expect(second.sessionIndex).toBe(1);

        attendanceRepo.count.mockResolvedValueOnce(2);
        await expect(service.clockIn('e1', 'Extra in', 'WEB')).rejects.toThrow(BadRequestException);
    });

    it('blocks self-service check-in from coffee-shop IP or outside GPS geofence and allows office IP + in-radius GPS', async () => {
        policyRepo.findOne.mockResolvedValue({
            id: 'pol-office',
            name: 'Clinic On-Site Only',
            isDefault: true,
            isActive: true,
            graceMinutes: 5,
            allowSelfServiceWeb: true,
            allowedIps: ['203.189.132.0/24'],
            requireGeofence: true,
            officeLatitude: 11.5564,
            officeLongitude: 104.9282,
            geofenceRadiusMeters: 150,
            sessions: [{ label: 'Full Day', checkInTime: '08:00', checkOutTime: '17:00' }],
        } as never);
        attendanceRepo.findOne.mockResolvedValue(null);
        attendanceRepo.count.mockResolvedValue(0);
        attendanceRepo.create.mockImplementation((d) => d);
        attendanceRepo.save.mockImplementation(async (d) => ({ id: 'log-geo', ...d }));

        // Coffee-shop IP rejected
        await expect(
            service.clockIn('e1', 'Coffee shop', 'WEB', 'u1', {
                isSelfService: true,
                clientIp: '110.74.200.55',
                latitude: 11.5564,
                longitude: 104.9282,
            }),
        ).rejects.toThrow(ForbiddenException);

        // Office IP but 2km away GPS rejected
        await expect(
            service.clockIn('e1', 'Far away', 'WEB', 'u1', {
                isSelfService: true,
                clientIp: '203.189.132.45',
                latitude: 11.5764,
                longitude: 104.9282,
            }),
        ).rejects.toThrow(ForbiddenException);

        // Office IP + in-radius GPS allowed
        const ok = await service.clockIn('e1', 'At clinic', 'WEB', 'u1', {
            isSelfService: true,
            clientIp: '203.189.132.45',
            latitude: 11.5565,
            longitude: 104.9283,
        });
        expect(ok.clockInIp).toBe('203.189.132.45');
        expect(ok.distanceMeters).toBeLessThanOrEqual(150);
    });

    it('soft-deletes an attendance log with actor & reason and restores it cleanly', async () => {
        attendanceRepo.findOne
            .mockResolvedValueOnce({ id: 'log-del', employeeId: 'e1' } as never)
            .mockResolvedValueOnce({ id: 'log-del', employeeId: 'e1', deletedAt: new Date() } as never)
            .mockResolvedValueOnce({ id: 'log-del', employeeId: 'e1', deletedAt: null } as never);
        attendanceRepo.update = jest.fn().mockResolvedValue({ affected: 1 });
        attendanceRepo.softDelete = jest.fn().mockResolvedValue({ affected: 1 });
        attendanceRepo.restore = jest.fn().mockResolvedValue({ affected: 1 });

        const delRes = await service.softDeleteAttendanceLog('log-del', 'admin-1', 'Test entry');
        expect(delRes).toEqual({ deleted: true, id: 'log-del' });
        expect(attendanceRepo.update).toHaveBeenCalledWith('log-del', {
            deletedById: 'admin-1',
            deleteReason: 'Test entry',
        });
        expect(attendanceRepo.softDelete).toHaveBeenCalledWith('log-del');

        const restored = await service.restoreAttendanceLog('log-del', 'admin-1');
        expect(attendanceRepo.restore).toHaveBeenCalledWith('log-del');
        expect(restored.id).toBe('log-del');
    });
});
