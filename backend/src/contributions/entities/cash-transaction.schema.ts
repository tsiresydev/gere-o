import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CashDirection } from '../../common/enums/cash-direction.enum';
import { CashTransactionType } from '../../common/enums/cash-transaction-type.enum';

export type CashTransactionDocument = HydratedDocument<CashTransaction>;

@Schema({ timestamps: true, collection: 'cash_transactions' })
export class CashTransaction {
  @Prop({ required: true, enum: CashTransactionType })
  type: CashTransactionType;

  @Prop({ required: true, enum: CashDirection })
  direction: CashDirection;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ type: Types.ObjectId, ref: 'Contribution' })
  contributionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Expense' })
  expenseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CashTransaction' })
  correctionOf?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  createdByName: string;

  /** Solde de la caisse juste après cette écriture (calculé par le backend). */
  @Prop()
  balanceAfter?: number;

  createdAt?: Date;

  updatedAt?: Date;
}

export const CashTransactionSchema =
  SchemaFactory.createForClass(CashTransaction);

CashTransactionSchema.index(
  { contributionId: 1 },
  { unique: true, sparse: true },
);
CashTransactionSchema.index({ expenseId: 1 }, { unique: true, sparse: true });
CashTransactionSchema.index({ createdAt: -1 });
CashTransactionSchema.index({ type: 1, createdAt: -1 });
CashTransactionSchema.index({ correctionOf: 1 });
