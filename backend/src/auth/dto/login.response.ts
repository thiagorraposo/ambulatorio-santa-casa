export class LoginResponse {
  trocaObrigatoria?: boolean;
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: number;
}
