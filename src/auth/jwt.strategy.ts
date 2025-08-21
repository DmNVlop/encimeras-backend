// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        // 1. Obtenemos el secreto del ConfigService
        const secret = configService.get<string>('JWT_SECRET');

        // 2. Comprobamos si el secreto existe. Si no, la app no debe arrancar.
        if (!secret) {
            throw new Error('JWT_SECRET no está definido en el archivo .env. La aplicación no puede iniciarse de forma segura.');
        }

        // 3. Pasamos la configuración al constructor de la estrategia
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        // El payload es el objeto que firmamos en el método login()
        // NestJS lo adjuntará al objeto request.user
        return { userId: payload.sub, username: payload.username };
    }
}
