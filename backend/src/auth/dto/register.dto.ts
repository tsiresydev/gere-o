import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../config/constants';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
  })
  @MaxLength(128, { message: 'Le mot de passe ne doit pas dépasser 128 caractères' })
  password: string;

  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MaxLength(100, { message: 'Le prénom ne doit pas dépasser 100 caractères' })
  firstName: string;

  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(100, { message: 'Le nom ne doit pas dépasser 100 caractères' })
  lastName: string;
}
