import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Department } from "./entities/department.entity";
import { JobTitle } from "./entities/job-title.entity";
import { Employee } from "./entities/employee.entity";
import { EmployeePosition } from "./entities/employee-position.entity";
import { EmployeeAttribute } from "./entities/employee-attribute.entity";
import { WorkSchedule } from "./entities/work-schedule.entity";
import { ScheduleOverride } from "./entities/schedule-override.entity";
import { LeaveRequest } from "./entities/leave-request.entity";
import { LeavePolicy } from "./entities/leave-policy.entity";
import { AttendanceLog } from "./entities/attendance-log.entity";
import { User } from "../users/entities/user.entity";
import { UsersModule } from "../users/users.module";
import { RbacModule } from "../rbac/rbac.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { CustomersModule } from "../customers/customers.module";
import { DepartmentsController } from "./controllers/departments.controller";
import { JobTitlesController } from "./controllers/job-titles.controller";
import { EmployeeSelfServiceController } from "./controllers/employee-self-service.controller";
import { RosterController } from "./controllers/roster.controller";
import { EmployeesController } from "./controllers/employees.controller";
import { PositionsController } from "./controllers/positions.controller";
import { SchedulesController } from "./controllers/schedules.controller";
import { LeaveRequestsController } from "./controllers/leave-requests.controller";
import { DepartmentsService } from "./services/departments.service";
import { JobTitlesService } from "./services/job-titles.service";
import { EmployeesService } from "./services/employees.service";
import { PositionsService } from "./services/positions.service";
import { SchedulesService } from "./services/schedules.service";
import { LeaveRequestsService } from "./services/leave-requests.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Department,
            JobTitle,
            Employee,
            EmployeePosition,
            EmployeeAttribute,
            WorkSchedule,
            ScheduleOverride,
            LeaveRequest,
            LeavePolicy,
            AttendanceLog,
            User, // ← for FK on employee.userId
        ]),
        UsersModule, // ✅ for UsersService.exists() / getEmail() in employees.service
        RbacModule,  // ✅ for PermissionsGuard in controllers
        ApiKeysModule, // ✅ for UnifiedAuthGuard in controllers
        CustomersModule, // for AttributeSchemasService validation on position attributes
    ],
    controllers: [
        DepartmentsController,
        JobTitlesController,
        EmployeeSelfServiceController,
        RosterController,
        EmployeesController,
        PositionsController,
        SchedulesController,
        LeaveRequestsController,
    ],
    providers: [
        DepartmentsService,
        JobTitlesService,
        EmployeesService,
        PositionsService,
        SchedulesService,
        LeaveRequestsService,
    ],
    exports: [
        EmployeesService,
        SchedulesService,
        LeaveRequestsService,
        DepartmentsService,
        JobTitlesService,
    ],
})
export class EmployeesModule { }
