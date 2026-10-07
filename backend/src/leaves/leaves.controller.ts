import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { UsersService } from '../users/users.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { DecideLeaveRequestDto } from './dto/decide-leave-request.dto';
import { InitializeBalanceDto } from './dto/initialize-balance.dto';
import {
  LeaveBalanceResponseDto,
  LeaveRequestResponseDto,
} from './dto/leave-response.dto';
import { LeavesService } from './leaves.service';

@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leavesService.create(user.id, dto);
    return LeaveRequestResponseDto.from(request);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser): Promise<LeaveRequestResponseDto[]> {
    const requests = await this.leavesService.findAll(user.id);
    return requests.map((request) => LeaveRequestResponseDto.from(request));
  }

  @Get('history')
  async history(@CurrentUser() user: AuthUser): Promise<LeaveRequestResponseDto[]> {
    const requests = await this.leavesService.findAll(user.id);
    return requests.map((request) => LeaveRequestResponseDto.from(request));
  }

  @Get('balance')
  async balance(@CurrentUser() user: AuthUser): Promise<LeaveBalanceResponseDto> {
    const balance = await this.leavesService.balance(user.id);
    return LeaveBalanceResponseDto.from(balance);
  }

  @Post('balance/init')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async initialize(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitializeBalanceDto,
  ): Promise<LeaveBalanceResponseDto> {
    const targetId = dto.userId ?? user.id;
    const balance = await this.leavesService.initialize(targetId, dto.initialDays);
    return LeaveBalanceResponseDto.from(balance);
  }

  @Get('pending')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async findPending(): Promise<LeaveRequestResponseDto[]> {
    const requests = await this.leavesService.findPending();
    const dtos = requests.map((request) =>
      LeaveRequestResponseDto.from(request),
    );

    const userIds = [...new Set(dtos.map((dto) => dto.userId))];
    const applicants = await Promise.all(
      userIds.map(async (id) => {
        const user = await this.usersService.findById(id);
        return [id, user ? `${user.firstName} ${user.lastName}`.trim() : undefined] as const;
      }),
    );
    const names = new Map(applicants);

    return dtos.map((dto) => {
      dto.applicantName = names.get(dto.userId);
      return dto;
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leavesService.findOne(user.id, id);
    return LeaveRequestResponseDto.from(request);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideLeaveRequestDto,
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leavesService.decide(user.id, id, dto);
    return LeaveRequestResponseDto.from(request);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.leavesService.remove(user.id, id);
  }
}
