import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ContributionMemberStatus } from '../../common/enums/contribution-member-status.enum';

export type ContributionMemberDocument = HydratedDocument<ContributionMember>;

@Schema({ timestamps: true, collection: 'contribution_members' })
export class ContributionMember {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  seedKey?: string;

  @Prop({
    required: true,
    enum: ContributionMemberStatus,
    default: ContributionMemberStatus.ACTIVE,
  })
  status: ContributionMemberStatus;

  /** Droit propre au module Cotisations, indépendant du rôle global Gere-o. */
  @Prop({ default: false })
  canValidate: boolean;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop()
  deactivatedAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ContributionMemberSchema =
  SchemaFactory.createForClass(ContributionMember);

ContributionMemberSchema.index({ email: 1 }, { unique: true });
ContributionMemberSchema.index({ seedKey: 1 }, { unique: true, sparse: true });
ContributionMemberSchema.index({ userId: 1 }, { unique: true, sparse: true });
ContributionMemberSchema.index({ status: 1, name: 1 });
