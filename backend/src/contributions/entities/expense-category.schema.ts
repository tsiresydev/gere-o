import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema({ timestamps: true, collection: 'expense_categories' })
export class ExpenseCategory {
  @Prop({ required: true, uppercase: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

ExpenseCategorySchema.index({ name: 1 }, { unique: true });
ExpenseCategorySchema.index({ isActive: 1, label: 1 });
