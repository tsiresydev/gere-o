import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContributionMemberStatus } from '../common/enums/contribution-member-status.enum';
import {
  INITIAL_CONTRIBUTION_MEMBERS,
  INITIAL_EXPENSE_CATEGORIES,
} from '../config/constants';
import { User } from '../users/entities/user.schema';
import {
  ContributionMember,
  ContributionMemberDocument,
} from './entities/contribution-member.schema';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from './entities/expense-category.schema';

/** Initialise la nouvelle caisse de façon idempotente, sans créer de compte Gere-o. */
@Injectable()
export class ContributionSeedService implements OnModuleInit {
  private readonly logger = new Logger(ContributionSeedService.name);

  constructor(
    @InjectModel(ContributionMember.name)
    private readonly memberModel: Model<ContributionMemberDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    const emails = INITIAL_CONTRIBUTION_MEMBERS.map((member) => member.email);
    const users = await this.userModel
      .find({ email: { $in: emails } })
      .select('email')
      .exec();
    const userIdByEmail = new Map(
      users.map((user) => [user.email.toLowerCase(), user._id.toString()]),
    );

    for (const member of INITIAL_CONTRIBUTION_MEMBERS) {
      await this.memberModel.updateOne(
        { $or: [{ seedKey: member.email }, { email: member.email }] },
        {
          $setOnInsert: {
            name: member.name,
            email: member.email,
            seedKey: member.email,
            status: ContributionMemberStatus.ACTIVE,
            canValidate: member.canValidate ?? false,
            joinedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    // Un compte créé après l'amorçage est associé automatiquement, sans écraser
    // le statut actif/inactif ni le droit de validation défini à l'insertion.
    for (const [email, userId] of userIdByEmail) {
      await this.memberModel.updateMany(
        { email, userId: { $exists: false } },
        { $set: { userId } },
      );
    }

    for (const category of INITIAL_EXPENSE_CATEGORIES) {
      await this.categoryModel.updateOne(
        { name: category.name },
        {
          $setOnInsert: {
            name: category.name,
            label: category.label,
            isActive: true,
          },
        },
        { upsert: true },
      );
    }

    this.logger.log('Caisse commune initialisée (membres et catégories)');
  }
}
