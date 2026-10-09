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
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { InitializeBalanceDto } from './dto/initialize-balance.dto';
import { LeaveBalanceResponseDto,
  LeaveRequestResponseDto,
} from './dto/leave-response.dto';
import { LeavesService } from './leaves.service';

@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
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
  async initialize(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitializeBalanceDto,
  ): Promise<LeaveBalanceResponseDto> {
    const balance = await this.leavesService.initialize(user.id, dto.initialDays);
    return LeaveBalanceResponseDto.from(balance);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leavesService.findOne(user.id, id);
    return LeaveRequestResponseDto.from(request);
  }

  @Patch(':id/validate')
  async validate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leavesService.validate(user.id, id);
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
