import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ContributionStatus } from '../../common/enums/contribution-status.enum';

export type ContributionDocument = HydratedDocument<Contribution>;

@Schema({ timestamps: true, collection: 'contributions' })
export class Contribution {
  @Prop({ type: Types.ObjectId, ref: 'ContributionMember', required: true })
  memberId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 12 })
  periodMonth: number;

  @Prop({ required: true, min: 2026 })
  periodYear: number;

  @Prop({ required: true, min: 0 })
  expectedAmount: number;

  @Prop({ required: true, min: 0 })
  declaredAmount: number;

  @Prop({ required: true })
  paymentDate: Date;

  @Prop()
  paymentMethod?: string;

  @Prop({
    required: true,
    enum: ContributionStatus,
    default: ContributionStatus.EN_ATTENTE_DE_VALIDATION,
  })
  status: ContributionStatus;

  /** Clé d'unicité active, supprimée lors d'un refus pour autoriser une nouvelle déclaration. */
  @Prop()
  uniqueKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  declaredBy: Types.ObjectId;

  @Prop({ default: Date.now })
  declaredAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  validatedBy?: Types.ObjectId;

  @Prop()
  validatedAt?: Date;

  @Prop({ min: 0 })
  validatedAmount?: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  notes?: string;

  /** Relie les mois d'une même déclaration groupée. */
  @Prop({ required: true })
  declarationGroupId: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ContributionSchema = SchemaFactory.createForClass(Contribution);

ContributionSchema.index({ uniqueKey: 1 }, { unique: true, sparse: true });
ContributionSchema.index({ memberId: 1, periodYear: -1, periodMonth: -1 });
ContributionSchema.index({ periodYear: -1, periodMonth: -1, status: 1 });
ContributionSchema.index({ declarationGroupId: 1 });
ContributionSchema.index({ status: 1, createdAt: -1 });
