import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExpenseDocument = HydratedDocument<Expense>;

export enum ExpenseStatus {
  ENREGISTREE = 'ENREGISTREE',
}

@Schema({ timestamps: true, collection: 'expenses' })
export class Expense {
  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true })
  expenseDate: Date;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  createdByName: string;

  @Prop({ required: true, enum: ExpenseStatus, default: ExpenseStatus.ENREGISTREE })
  status: ExpenseStatus;

  /** Solde de la caisse juste après cette écriture (calculé par le backend). */
  @Prop({ min: 0 })
  balanceAfter?: number;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ category: 1, expenseDate: -1 });
ExpenseSchema.index({ expenseDate: -1 });
