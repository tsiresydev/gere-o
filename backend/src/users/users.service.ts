import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateUserInput } from './dto/create-user.input';
import { User, UserDocument } from './entities/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    try {
      return await this.userModel.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email: email.trim().toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return await this.userModel.findById(id);
  }

  async findAll(): Promise<UserDocument[]> {
    return await this.userModel.find().sort({ createdAt: -1 });
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
