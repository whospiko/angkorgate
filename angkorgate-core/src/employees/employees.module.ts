import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Department } from "./entities/department.entity";
import { JobTitle } from "./entities/job-title.entity";
import { Employee } from "./entities/employee.entity";
import { EmployeePosition } from "./entities/employee-position.entity";
import { EmployeeAttribute } from "./entities/employee-attribute.entity";
import { WorkSchedule } from "./entities/work-schedule.entity";
import { User } from "../users/entities/user.entity";
import { UsersModule } from "../users/users.module";
import { RbacModule } from "../rbac/rbac.module";
import { DepartmentsController } from "./controllers/departments.controller";
import { JobTitlesController } from "./controllers/job-titles.controller";
import { EmployeesController } from "./controllers/employees.controller";
import { PositionsController } from "./controllers/positions.controller";
import { SchedulesController } from "./controllers/schedules.controller";
import { DepartmentsService } from "./services/departments.service";
import { JobTitlesService } from "./services/job-titles.service";
import { EmployeesService } from "./services/employees.service";
import { PositionsService } from "./services/positions.service";
import { SchedulesService } from "./services/schedules.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Department,
            JobTitle,
            Employee,
            EmployeePosition,
            EmployeeAttribute,
            WorkSchedule,
            User, // ← for FK on employee.userId
        ]),
        UsersModule, // ✅ for UsersService.exists() / getEmail() in employees.service
        RbacModule,  // ✅ for PermissionsGuard in controllers
    ],
    controllers: [
        DepartmentsController,
        JobTitlesController,
        EmployeesController,
        PositionsController,
        SchedulesController,
    ],
    providers: [
        DepartmentsService,
        JobTitlesService,
        EmployeesService,
        PositionsService,
        SchedulesService,
    ],
    exports: [
        EmployeesService,    // 👈 used by future appointments/attendance modules
        SchedulesService,    // 👈 used by future appointments
        DepartmentsService,
        JobTitlesService,
    ],
})
export class EmployeesModule { }
