import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponseDto,
} from "./dto";
import { Public } from "@/common/decorators";
import { CurrentUser } from "@/common/decorators";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "ユーザー登録" })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ログイン" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip ?? "unknown";
    const userAgent = req.headers["user-agent"];
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "トークンリフレッシュ" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "ログアウト" })
  logout(@CurrentUser("id") userId: string, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(userId, dto.refreshToken);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "パスワードリセット要求" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "パスワードリセット実行" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "現在のユーザー情報取得" })
  getMe(@CurrentUser("id") userId: string) {
    return this.authService.getMe(userId);
  }
}
