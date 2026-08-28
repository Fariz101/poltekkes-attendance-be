import { Injectable } from '@nestjs/common';
import { hash, compare } from 'bcrypt';

@Injectable()
export class BcryptService {
    async hashPassword(password: string): Promise<string> {
        const saltRound = 10
        return await hash(password, saltRound)
    }
    async comparePassword(password: string, hashedPassword: string):
        Promise<boolean> {
        return await compare(password, hashedPassword)
    }

}
