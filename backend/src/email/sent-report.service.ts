import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  CreateSentReportInput,
  SentReportPageResponse,
  SentReportResponseDto,
  SentReportSummaryDto,
} from './dto/sent-report.dto';
import { SentReport, SentReportDocument } from './entities/sent-report.schema';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

@Injectable()
export class SentReportService {
  constructor(
    @InjectModel(SentReport.name)
    private readonly sentReportModel: Model<SentReportDocument>,
  ) {}

  async create(
    userId: string,
    input: CreateSentReportInput,
  ): Promise<SentReportDocument> {
    return this.sentReportModel.create({ userId, ...input });
  }

  async list(
    userId: string,
    query: { page?: number; limit?: number; year?: number; month?: number },
  ): Promise<SentReportPageResponse> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const filter: FilterQuery<SentReport> = { userId };
    if (query.year !== undefined) {
      filter.year = query.year;
    }
    if (query.month !== undefined) {
      filter.month = query.month;
    }

    const [reports, total] = await Promise.all([
      this.sentReportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.sentReportModel.countDocuments(filter),
    ]);

    return {
      items: reports.map((report) => SentReportSummaryDto.from(report)),
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string): Promise<SentReportResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Rapport introuvable');
    }

    const report = await this.sentReportModel.findOne({ _id: id, userId });
    if (!report) {
      throw new NotFoundException('Rapport introuvable');
    }

    return SentReportResponseDto.detail(report);
  }
}
